import {NextRequest,NextResponse} from "next/server";
import OpenAI from "openai";
import {z} from "zod";
import {verify,verdict,WARNING} from "@/lib/verify";
export const runtime="nodejs";
const formSchema=z.object({brand:z.string().max(200),type:z.string().max(200),abv:z.string().max(40),volume:z.string().max(40),producer:z.string().max(300),origin:z.string().max(200),beverage:z.enum(["spirits","wine","beer"])});
const nullableText=z.preprocess(value=>typeof value==="string"?value:typeof value==="number"?String(value):null,z.string().nullable());
const nullableFlag=z.preprocess(value=>typeof value==="boolean"?value:null,z.boolean().nullable());
const notesSchema=z.preprocess(value=>Array.isArray(value)?value.filter((item):item is string=>typeof item==="string"):[],z.array(z.string()));
const extraction=z.object({brand:nullableText,type:nullableText,abv:nullableText,volume:nullableText,producer:nullableText,origin:nullableText,warning:nullableText,warningHeadingUppercase:nullableFlag,warningHeadingBold:nullableFlag,warningLegible:nullableFlag,notes:notesSchema});
export async function POST(request:NextRequest){
 const started=Date.now();
 try{
  if(!process.env.OPENAI_API_KEY)return NextResponse.json({error:"Server AI credentials are not configured."},{status:503});
  const data=await request.formData();const file=data.get("file");if(!(file instanceof File))return NextResponse.json({error:"Select a label image."},{status:400});
  if(!["image/jpeg","image/png","image/webp"].includes(file.type))return NextResponse.json({error:"Use PNG, JPEG or WebP. Convert PDF artwork to an image before uploading."},{status:415});
  if(file.size>8*1024*1024)return NextResponse.json({error:"Image exceeds the 8 MB limit."},{status:413});
  const application=formSchema.safeParse(JSON.parse(String(data.get("application")||"{}")));if(!application.success)return NextResponse.json({error:"Invalid application information."},{status:400});
  const encoded=Buffer.from(await file.arrayBuffer()).toString("base64");
  const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY,timeout:18000,maxRetries:0});
  // Moderate the uploaded image before sending it for label extraction.
  // A failed moderation request blocks verification rather than silently bypassing screening.
  let moderation;
  try{
   moderation=await client.moderations.create({
    model:"omni-moderation-latest",
    input:[{type:"image_url",image_url:{url:`data:${file.type};base64,${encoded}`}}],
   });
  }catch(error){
   const status=error instanceof OpenAI.APIError?error.status:undefined;
   const requestId=error instanceof OpenAI.APIError?error.requestID:undefined;
   const cause=error instanceof Error?error.name:"UnknownError";
   console.error("Image moderation unavailable",{status,requestId,cause,message:error instanceof Error?error.message:"Unknown moderation error"});
   const reason=status===401?"The server API key was rejected. Check the Vercel OPENAI_API_KEY value.":status===403?"The API key does not have access to Moderations. Check key permissions and save the changes.":status===429?"The moderation API is rate limited. Please retry shortly.":status===400?"The moderation service rejected this image request.":cause==="APIConnectionTimeoutError"?"Image safety screening timed out. Please retry.":"Image safety screening is unavailable. Please try again later.";
   return NextResponse.json({error:reason,code:"MODERATION_UNAVAILABLE",requestId:requestId||undefined},{status:503});
  }
  const safety=moderation.results[0];
  if(!safety)return NextResponse.json({error:"Image safety screening could not complete. Please retry.",code:"MODERATION_UNAVAILABLE"},{status:503});
  if(safety.flagged||safety.categories["sexual"]||safety.categories["sexual/minors"]){
   return NextResponse.json({error:"This image cannot be processed because it was flagged by the image safety check.",code:"IMAGE_REJECTED"},{status:422});
  }
  const response=await client.chat.completions.create({model:process.env.OPENAI_MODEL||"gpt-4.1-mini",temperature:0,response_format:{type:"json_object"},messages:[{role:"system",content:`Extract alcohol-label artwork evidence conservatively. Reply with JSON only, keys brand,type,abv,volume,producer,origin,warning,warningHeadingUppercase,warningHeadingBold,warningLegible,notes. Use null whenever unclear or not visible. For warning, return the exact visible words and punctuation, preserving heading capitalization, not a paraphrase. Never reconstruct missing warning words from memory. Visual flags are true only with clear visual evidence. Warning to compare against: ${WARNING}`},{role:"user",content:[{type:"text",text:"Read this label image. Do not invent any missing text. If multiple sides are not shown, report missing elements as null."},{type:"image_url",image_url:{url:`data:${file.type};base64,${encoded}`,detail:"high"}}]}]});
  const raw=response.choices[0]?.message?.content;if(!raw)throw new Error("AI returned no extraction");
  const modelJson:unknown=JSON.parse(raw);
  const candidate=modelJson&&typeof modelJson==="object"&&!Array.isArray(modelJson)?modelJson:{};
  const parsed=extraction.safeParse(candidate);
  if(!parsed.success){console.error("AI extraction schema mismatch",parsed.error.issues.map(issue=>({path:issue.path.join("."),code:issue.code})));return NextResponse.json({error:"AI returned an unexpected data format. Please retry."},{status:502});}
  if(!modelJson||typeof modelJson!=="object"||Array.isArray(modelJson))return NextResponse.json({error:"AI returned no usable label evidence. Please retry."},{status:502});
  const extracted=parsed.data;const findings=verify(application.data,extracted);
  return NextResponse.json({extracted,findings,verdict:verdict(findings),durationMs:Date.now()-started});
 }catch(error){console.error("Label verification error",error);return NextResponse.json({error:"Label verification could not complete. Check the server logs or retry."},{status:500})}
}
