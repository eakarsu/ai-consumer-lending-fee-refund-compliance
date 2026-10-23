import test from "node:test";
import assert from "node:assert/strict";
// Unset provider keys before importing app modules (this module makes no provider calls).
delete process.env.OPENROUTER_API_KEY; delete process.env.OPENAI_API_KEY;
import { filterRecords, toCsv, buildInsights } from "../featurePack.mjs";
const rows=[
 {id:1,feature_id:"f1",reference:"A-1",title:"Alpha case",status:"Open",owner:"Sam",risk:"High",due_date:"2020-01-01",amount:0,payload:{project:"Alpha",note:false}},
 {id:2,feature_id:"f1",reference:"B-2",title:"Beta case",status:"Closed",owner:"Jo",risk:"Low",due_date:"2999-01-01",amount:250,payload:{project:"Beta"}},
];
const feature={id:"f1",title:"Change orders",fields:[{key:"project"},{key:"note"}]};
test("filterRecords searches and filters main list",()=>{
 assert.equal(filterRecords(rows,{q:"alpha"}).length,1);
 assert.equal(filterRecords(rows,{status:"Closed"}).length,1);
 assert.equal(filterRecords(rows,{risk:"High"})[0].reference,"A-1");
 assert.equal(filterRecords(rows,{q:"missing"}).length,0);
});
test("toCsv preserves 0/false and escapes commas",()=>{
 const csv=toCsv(rows); assert.ok(csv.includes(",0,")); assert.ok(csv.includes("false")); assert.ok(csv.split("\n")[0].startsWith("id,feature_id"));
});
test("buildInsights is labelled deterministic fallback with aiGenerated:false and preserves zero",()=>{
 const out=buildInsights(rows,feature,new Date("2026-01-01"));
 assert.equal(out.aiGenerated,false); assert.match(out.label,/Deterministic fallback/); assert.equal(out.insights.length,3);
 assert.equal(out.insights[1].totalValue,250);
 const empty=buildInsights([],feature); assert.equal(empty.recordCount,0); assert.equal(empty.insights[0].overdueCount,0); assert.equal(empty.sections.length,3);
});
