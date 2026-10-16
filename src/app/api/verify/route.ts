import {NextRequest,NextResponse} from "next/server";
import OpenAI from "openai";
import {z} from "zod";
import {verify,verdict,WARNING} from "@/lib/verify";
export const runtime="nodejs";
const formSchema=z.object({brand:z.string().max(200),type:z.string().max(200),abv:z.string().max(40),volume:z.string().max(40),producer:z.string().max(300),origin:z.string().max(200),beverage:z.enum(["spirits","wine","beer"])});
const extraction=z.object({brand:z.string().nullable(),type:z.string().nullable(),abv:z.string().nullable(),volume:z.string().nullable(),producer:z.string().nullable(),origin:z.string().nullable(),warning:z.string().nullable(),warningHeadingUppercase:z.boolean().nullable(),warningHeadingBold:z.boolean().nullable(),warningLegible:z.boolean().nullable(),notes:z.array(z.string())});
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
  const response=await client.chat.completions.create({model:process.env.OPENAI_MODEL||"gpt-4.1-mini",temperature:0,response_format:{type:"json_object"},messages:[{role:"system",content:`Extract alcohol-label artwork evidence conservatively. Reply with JSON only, keys brand,type,abv,volume,producer,origin,warning,warningHeadingUppercase,warningHeadingBold,warningLegible,notes. Use null whenever unclear or not visible. For warning, return the exact visible words and punctuation, preserving heading capitalization, not a paraphrase. Never reconstruct missing warning words from memory. Visual flags are true only with clear visual evidence. Warning to compare against: ${WARNING}`},{role:"user",content:[{type:"text",text:"Read this label image. Do not invent any missing text. If multiple sides are not shown, report missing elements as null."},{type:"image_url",image_url:{url:`data:${file.type};base64,${encoded}`,detail:"high"}}]}]});
  const raw=response.choices[0]?.message?.content;if(!raw)throw new Error("AI returned no extraction");
  const extracted=extraction.parse(JSON.parse(raw));const findings=verify(application.data,extracted);
  return NextResponse.json({extracted,findings,verdict:verdict(findings),durationMs:Date.now()-started});
 }catch(error){console.error("Label verification error",error);return NextResponse.json({error:"Unable to verify this image. Try a clearer image or retry."},{status:500})}
}
