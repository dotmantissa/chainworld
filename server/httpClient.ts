// Optional development transport for environments whose outbound traffic requires an HTTP bridge.
// Production always uses native HTTPS. Credentials remain in server-side request headers.
export const serverFetch: typeof fetch = (input,init) => {
  const proxy=process.env.NODE_ENV!=='production'?process.env.LOCAL_HTTP_PROXY_URL:undefined
  if(!proxy)return fetch(input,init)
  const target=typeof input==='string'?input:input instanceof URL?input.href:input.url
  if(!target.startsWith('https://'))return fetch(input,init)
  return fetch(proxy,{...init,headers:{...Object.fromEntries(new Headers(init?.headers)),'x-chainworld-target':target}})
}
