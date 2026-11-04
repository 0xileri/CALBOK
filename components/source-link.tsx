import {safeSourceUrl,sourceLabel} from '@/lib/source-links';
export function SourceLink({source,icon=false,duplicate=false}:{source:unknown;icon?:boolean;duplicate?:boolean}){
 const url=safeSourceUrl(source),label=sourceLabel(source);
 if(!url)return <span className="source-missing">No source link</span>;
 return <a className={icon?'source-icon':'source-post-button'} href={url} target="_blank" rel="noopener noreferrer nofollow" tabIndex={duplicate?-1:undefined} title={label||undefined} aria-label={icon?'View original post on '+label:undefined}>
  {icon?<svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true"><path d="M11 3h6v6M17 3l-9 9M8 4H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>:<><span>View original post ↗</span><small>{label}</small></>}
 </a>;
}
