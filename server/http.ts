import type { IncomingMessage, ServerResponse } from 'node:http'
export type Request = IncomingMessage & { body?: unknown; query?: Record<string,string|string[]> }
export type Response = ServerResponse
export class HttpError extends Error { constructor(public status: number, message: string) { super(message) } }
export function send(res: Response, status: number, value: unknown) {
  res.statusCode = status; res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(value))
}
export async function body(req: Request): Promise<Record<string,unknown>> {
  if(req.body !== undefined) {
    const parsed=typeof req.body==='string'?JSON.parse(req.body):req.body
    if(!parsed || typeof parsed!=='object'||Array.isArray(parsed))throw new HttpError(400,'Invalid request body')
    return parsed as Record<string,unknown>
  }
  let text=''
  for await(const chunk of req){text+=chunk;if(text.length>16384)throw new HttpError(413,'Request too large')}
  try {const parsed=JSON.parse(text);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error();return parsed}catch{throw new HttpError(400,'Invalid JSON')}
}
export function origin(req: Request): string {
  const configured=process.env.APP_ORIGIN
  if(configured)return new URL(configured).origin
  if(process.env.NODE_ENV==='production')throw new HttpError(503,'APP_ORIGIN is not configured')
  return 'http://localhost:5175'
}
export function checkOrigin(req: Request) {
  if(req.headers.origin!==origin(req))throw new HttpError(403,'Request origin is not allowed')
}
export function endpoint(fn:(req:Request,res:Response)=>Promise<void>) {
  return async(req:Request,res:Response)=>{
    try{await fn(req,res)}catch(error){
      if(error instanceof HttpError)send(res,error.status,{error:error.message})
      else{console.error('[ChainWorld API]',error instanceof Error?error.name:'Unknown server error');send(res,503,{error:'The game service is unavailable. Your stored progress has not been reset.'})}
    }
  }
}
