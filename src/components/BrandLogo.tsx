export const BRAND_MARK='/brand/chainworld-mark.svg'

export default function BrandLogo(){
 return <a className="wordmark" href="/" aria-label="ChainWorld home"><img className="brand-mark" src={BRAND_MARK} width="40" height="40" alt=""/><span className="brand-name">chain<span className="brand-world">world</span></span></a>
}
