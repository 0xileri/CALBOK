import { ImageResponse } from 'next/og';
export const alt='CALBOK — Calls fade. Receipts stay. Lock the call. Verify the outcome. Remember the lesson.';
export const size={width:1200,height:630};
export const contentType='image/png';
export default function Image() {
  return new ImageResponse(<div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',background:'#142c25',color:'#f4f2e9',padding:'54px 64px',position:'relative'}}>
    <div style={{display:'flex',alignItems:'center',fontSize:34,fontWeight:700,letterSpacing:-1}}><svg width="52" height="52" viewBox="0 0 48 48" style={{marginRight:10}}><path d="M36 12H18a8 8 0 0 0-8 8v16l5-3 5 3 5-3 5 3 6-4v-4H21a4 4 0 0 1-4-4v-3a3 3 0 0 1 3-3h16V12Z" fill="#f4f2e9"/><path d="m32 20 5 4-5 4" fill="none" stroke="#ef7145" strokeWidth="3"/></svg>CALBOK<span style={{color:'#ef7145'}}>.</span></div>
    <div style={{display:'flex',marginTop:60,fontSize:14,letterSpacing:4,color:'#d5e6bf'}}>LESS NOISE. MORE RECEIPTS.</div>
    <div style={{display:'flex',flexDirection:'column',fontSize:101,fontWeight:700,letterSpacing:-6,lineHeight:1.07,marginTop:24}}><span>Calls fade.</span><span style={{color:'#d5e6bf'}}>Receipts stay.</span></div>
    <div style={{display:'flex',marginTop:'auto',paddingTop:22,borderTop:'1px solid #48604d',fontSize:18,color:'#c1cebb'}}>Lock the call. Verify the outcome. Remember the lesson.</div>
    <div style={{display:'flex',position:'absolute',right:66,top:215,width:180,height:180,borderRadius:90,background:'#ef7145',color:'#142c25',alignItems:'center',justifyContent:'center',flexDirection:'column',fontSize:27,fontWeight:700,transform:'rotate(12deg)'}}>ON RECORD ↗</div>
  </div>,size);
}
