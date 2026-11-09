import {intakeModel,listIntakeProducts,DEFAULT_OUTPUT} from './model-intake/core.mjs';

const usage=`Local Frank Wilder model intake (no network or Unreal import)
  node scripts/intake-frank-wilder-model.mjs --list
  node scripts/intake-frank-wilder-model.mjs --product <exact-id> --model <absolute-file.glb|.fbx> --provenance <absolute-file.json>

Output: ${DEFAULT_OUTPUT}
GLB: self-contained, core glTF 2.0, embedded resources. Binary FBX is quarantined
after header checks only; full native validation is always pending.
All submissions require human design/rights/fit review. No mint or game rights are granted.`;

try{
  const args=process.argv.slice(2);
  if(args.length===1&&args[0]==='--list')console.log(JSON.stringify(await listIntakeProducts(),null,2));
  else if(!args.length||(args.length===1&&['--help','-h'].includes(args[0])))console.log(usage);
  else{
    const options={};const keys={'--product':'productId','--model':'modelPath','--provenance':'provenancePath'};
    for(let index=0;index<args.length;index+=2){
      const key=keys[args[index]],value=args[index+1];
      if(!key||!value||value.startsWith('--')||options[key])throw new Error('Unknown, duplicate or incomplete argument. Use --help.');
      options[key]=value;
    }
    if(Object.keys(options).length!==3)throw new Error('Product, model and provenance are all required. Use --help.');
    const {receipt,...result}=await intakeModel(options);
    console.log(JSON.stringify({...result,reviewStatus:receipt.status,preflight:receipt.preflight,authority:receipt.authority},null,2));
  }
}catch(error){console.error(JSON.stringify({error:error.code??'INTAKE_FAILED',message:error.message}));process.exitCode=1;}
