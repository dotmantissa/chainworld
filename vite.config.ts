import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
function apiPlugin():Plugin {
  return {name:'chainworld-api',configureServer(server){
    server.middlewares.use(async(req,res,next)=>{
      const path=req.url?.split('?')[0]
      if(!['/api/game','/api/session','/api/neighborhood'].includes(path??'')){next();return}
      try{const module=await server.ssrLoadModule(path==='/api/game'?'/server/game.ts':path==='/api/neighborhood'?'/server/neighborhood.ts':'/server/session.ts');await module.default(req,res)}catch{res.statusCode=503;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:'The shared game service is not configured.'}))}
    })
  }}
}
export default defineConfig(({mode})=>{
  const env=loadEnv(mode,process.cwd(),'')
  for(const key of ['DATABASE_URL','APP_ORIGIN','MONAD_TESTNET_RPC_URL','CHOG_ADDRESS','FAUCET_ADDRESS','REGISTRY_V2_ADDRESS','METADATA_HOSTS','LOCAL_HTTP_PROXY_URL'])if(env[key])process.env[key]=env[key]
  return {plugins:[react(),apiPlugin()],server:{port:5175,strictPort:true},build:{rollupOptions:{output:{manualChunks:{phaser:['phaser']}}}}}
})
