export type Application={brand:string,type:string,abv:string,volume:string,producer:string,origin:string,beverage:"spirits"|"wine"|"beer"};
export type Extracted={brand:string|null,type:string|null,abv:string|null,volume:string|null,producer:string|null,origin:string|null,warning:string|null,warningHeadingUppercase:boolean|null,warningHeadingBold:boolean|null,warningLegible:boolean|null,notes:string[]};
export type Finding={field:string,expected:string,observed:string,status:"match"|"mismatch"|"review",reason:string};
export const WARNING="GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.";
const clean=(s:string)=>s.normalize("NFKC").toLocaleLowerCase("en-US").replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g," ").trim();
const number=(s:string)=>{const x=s.match(/\d+(?:\.\d+)?/);return x?Number(x[0]):null};
function field(name:string,expected:string,observed:string|null,mode:"text"|"abv"|"volume"="text"):Finding{
 if(!expected.trim())return {field:name,expected:"Not provided",observed:observed||"Not found",status:"review",reason:"Application value not supplied"};
 if(!observed)return {field:name,expected,observed:"Not found",status:"review",reason:"Could not confidently extract this field"};
 let equal=clean(expected)===clean(observed);
 if(mode!=="text"){const a=number(expected),b=number(observed);equal=a!==null&&b!==null&&Math.abs(a-b)<0.001;}
 return {field:name,expected,observed,status:equal?"match":"mismatch",reason:equal?"Values agree":"Application and artwork differ"};
}
export function verify(app:Application,ex:Extracted):Finding[]{
 const results=[field("Brand",app.brand,ex.brand),field("Class / type",app.type,ex.type),field("ABV",app.abv,ex.abv,"abv"),field("Net contents",app.volume,ex.volume,"volume"),field("Producer / bottler",app.producer,ex.producer)];
 if(app.origin.trim())results.push(field("Country of origin",app.origin,ex.origin));
 const warning=ex.warning;
 const warningCorrect=warning?warning.replace(/\s+/g," ").trim()===WARNING:false;
 results.push({field:"Government warning text",expected:WARNING,observed:warning||"Not found",status:!warning?"review":warningCorrect?"match":"mismatch",reason:!warning?"Warning not legible or missing":warningCorrect?"Exact text confirmed":"Exact required wording not confirmed"});
 for(const [name,value] of [["Uppercase heading",ex.warningHeadingUppercase],["Bold heading",ex.warningHeadingBold],["Warning legibility",ex.warningLegible]] as const)results.push({field:name,expected:"Yes",observed:value===null?"Unknown":value?"Yes":"No",status:value===null?"review":value?"match":"mismatch",reason:value===null?"Human visual confirmation required":value?"Visual check passed":"Required visual characteristic not confirmed"});
 return results;
}
export function verdict(findings:Finding[]):"pass"|"fail"|"review"{return findings.some(x=>x.status==="mismatch")?"fail":findings.some(x=>x.status==="review")?"review":"pass"}
