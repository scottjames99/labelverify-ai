export type Application={brand:string,type:string,abv:string,volume:string,producer:string,origin:string,beverage:"spirits"|"wine"|"beer"};
export type Extracted={brand:string|null,type:string|null,abv:string|null,volume:string|null,producer:string|null,origin:string|null,warning:string|null,warningHeadingUppercase:boolean|null,warningHeadingBold:boolean|null,warningLegible:boolean|null,notes:string[]};
export type Finding={field:string,expected:string,observed:string,status:"match"|"mismatch"|"review",reason:string};
export const WARNING="GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.";
const clean=(s:string)=>s.normalize("NFKC").toLocaleLowerCase("en-US").replace(/[’‘]/g,"'").replace(/[^a-z0-9]+/g," ").trim();
const number=(s:string)=>{const x=s.match(/\d+(?:\.\d+)?/);return x?Number(x[0]):null};
type Quantity={ml:number,unit:"ml"|"l"|"fl oz"|"us qt"};
function quantities(value:string):Quantity[]{
 const matches=[...value.matchAll(/(\d+(?:\.\d+)?)\s*(millilit(?:er|re)s?|ml|lit(?:er|re)s?|l|fl\.?\s*oz\.?|fluid\s*ounces?|us\s*quarts?|quarts?|qts?)(?![a-z])/gi)];
 return matches.map(match=>{
  const amount=Number(match[1]);const unit=match[2].toLowerCase().replace(/\./g,"").replace(/\s+/g," ").trim();
  if(unit==="ml"||unit.startsWith("millilit"))return {ml:amount,unit:"ml" as const};
  if(unit==="l"||unit.startsWith("lit"))return {ml:amount*1000,unit:"l" as const};
  if(unit.includes("oz")||unit.includes("ounce"))return {ml:amount*29.5735295625,unit:"fl oz" as const};
  return {ml:amount*946.352946,unit:"us qt" as const};
 });
}
function volumeEqual(expected:string,observed:string):boolean|null{
 const left=quantities(expected),right=quantities(observed);
 if(!left.length||!right.length)return null;
 return left.some(a=>right.some(b=>Math.abs(a.ml-b.ml)<=Math.max(1,a.ml*0.005)));
}
function field(name:string,expected:string,observed:string|null,mode:"text"|"abv"|"volume"="text"):Finding{
 if(!expected.trim())return {field:name,expected:"Not provided",observed:observed||"Not found",status:"review",reason:"Application value not supplied"};
 if(!observed)return {field:name,expected,observed:"Not found",status:"review",reason:"Could not confidently extract this field"};
 let equal=clean(expected)===clean(observed);
 if(mode==="abv"){const a=number(expected),b=number(observed);equal=a!==null&&b!==null&&Math.abs(a-b)<0.001;}
 if(mode==="volume"){const comparison=volumeEqual(expected,observed);if(comparison===null)return {field:name,expected,observed,status:"review",reason:"Could not identify comparable volume units"};equal=comparison;}
 return {field:name,expected,observed,status:equal?"match":"mismatch",reason:equal?"Values agree":"Application and artwork differ"};
}
function originFinding(expected:string,observed:string|null):Finding{
 if(!expected.trim()||!observed)return field("Country of origin",expected,observed);
 const normalized=clean(observed);
 const expectedUs=/^(usa|u s a|united states|united states of america|us)$/.test(clean(expected));
 const hasUsCountry=/(?:^|\\s)(?:usa|u s a|united states(?: of america)?)(?:$|\\s)/.test(normalized);
 const isLocation=/\\b(?:milwaukee|[a-z]+(?:\\s+[a-z]+)?)\\s*,?\\s*(?:u\\s*s\\s*a|usa|united states)\\b/i.test(observed);
 const unionOnly=/\\bunion\\s+made\\s+(?:u\\s*\\.?\\s*s\\s*\\.?\\s*a\\.?|usa)\\b/i.test(observed)&&!isLocation;
 if(unionOnly)return {field:"Country of origin",expected,observed,status:"review",reason:"Union-made wording alone does not establish country of origin"};
 if(expectedUs&&hasUsCountry&&isLocation)return {field:"Country of origin",expected,observed,status:"match",reason:"Country matches the country shown in the location statement; regulatory sufficiency requires human review"};
 return field("Country of origin",expected,observed);
}
export function verify(app:Application,ex:Extracted):Finding[]{
 const results=[field("Brand",app.brand,ex.brand),field("Class / type",app.type,ex.type),field("ABV",app.abv,ex.abv,"abv"),field("Net contents",app.volume,ex.volume,"volume"),field("Producer / bottler",app.producer,ex.producer)];
 if(app.origin.trim())results.push(originFinding(app.origin,ex.origin));
 const warning=ex.warning;
 const warningCorrect=warning?warning.replace(/\s+/g," ").trim().toLocaleLowerCase("en-US")===WARNING.toLocaleLowerCase("en-US"):false;
 results.push({field:"Government warning text",expected:WARNING,observed:warning||"Not found",status:!warning?"review":warningCorrect?"match":"mismatch",reason:!warning?"Warning not legible or missing":warningCorrect?"Exact text confirmed":"Exact required wording not confirmed"});
 for(const [name,value] of [["Uppercase heading",ex.warningHeadingUppercase],["Bold heading",ex.warningHeadingBold],["Warning legibility",ex.warningLegible]] as const)results.push({field:name,expected:"Yes",observed:value===null?"Unknown":value?"Yes":"No",status:value===null?"review":value?"match":"mismatch",reason:value===null?"Human visual confirmation required":value?"Visual check passed":"Required visual characteristic not confirmed"});
 return results;
}
export function verdict(findings:Finding[]):"pass"|"fail"|"review"{return findings.some(x=>x.status==="mismatch")?"fail":findings.some(x=>x.status==="review")?"review":"pass"}
