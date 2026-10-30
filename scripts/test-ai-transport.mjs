import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../api/gemini.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {default:handler} = await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const prior = {fetch:globalThis.fetch,error:console.error,warn:console.warn,key:process.env.GEMINI_API_KEY,base:process.env.GEMINI_BASE_URL};
const fixtureCredential = 'transport-fixture-not-an-authentication-key';
let logs=[];
console.error=(...args)=>logs.push(args.join(' '));
console.warn=(...args)=>logs.push(args.join(' '));
function response() {return {code:200,body:null,status(code){this.code=code;return this;},json(body){this.body=body;return this;}};}
try {
  process.env.GEMINI_API_KEY=fixtureCredential;
  process.env.GEMINI_BASE_URL='https://provider.invalid';
  globalThis.fetch=async (url,options)=>{
    assert.equal(new URL(url).search,'');
    assert.ok(!url.includes(fixtureCredential));
    assert.equal(options.headers['x-goog-api-key'],fixtureCredential);
    return {ok:true,json:async()=>({candidates:[{content:{parts:[{text:'safe result'}]}}]})};
  };
  let res=response();
  await handler({method:'POST',body:{contents:[],requestType:'general-chat'}},res);
  assert.equal(res.body.response,'safe result');
  globalThis.fetch=async()=>({ok:false,status:403,text:async()=>fixtureCredential});
  res=response(); await handler({method:'POST',body:{contents:[]}},res);
  assert.equal(res.code,403);
  assert.ok(!JSON.stringify(res.body).includes(fixtureCredential));
  globalThis.fetch=async()=>{throw new Error('request failed '+fixtureCredential);};
  res=response(); await handler({method:'POST',body:{contents:[]}},res);
  assert.equal(res.code,500);
  assert.ok(!JSON.stringify(res.body).includes(fixtureCredential));
  assert.ok(!logs.join('\n').includes(fixtureCredential));
  console.log('AI transport: header-only credentials and error redaction tests passed.');
} finally {
  globalThis.fetch=prior.fetch; console.error=prior.error; console.warn=prior.warn;
  for(const [name,value] of [['GEMINI_API_KEY',prior.key],['GEMINI_BASE_URL',prior.base]]) {
    if(value===undefined) delete process.env[name]; else process.env[name]=value;
  }
}
