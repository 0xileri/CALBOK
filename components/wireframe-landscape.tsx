/** Decorative terrain, not a price chart or market evidence. No client runtime. */
export function WireframeLandscape(){
 const point=(x:number,depth:number)=>{
  const ridge=Math.sin(x/155+depth*0.55)*44+Math.cos(x/260-depth*0.4)*34;
  return [x,120+depth*21+ridge*(0.4+depth/15)];
 };
 const path=(points:number[][])=>points.map(([x,y],index)=>(index?'L':'M')+x.toFixed(1)+','+y.toFixed(1)).join(' ');
 return <div className="landscape-background" aria-hidden="true"><svg viewBox="0 0 1440 500" preserveAspectRatio="xMidYMax slice" focusable="false">
  {Array.from({length:18},(_,depth)=><path key={'h'+depth} d={path(Array.from({length:61},(_,i)=>point(i*24,depth)))}/>)}
  {Array.from({length:61},(_,column)=><path key={'v'+column} d={path(Array.from({length:18},(_,depth)=>point(column*24,depth)))}/>)}
  {Array.from({length:30},(_,column)=><path key={'d'+column} d={path(Array.from({length:18},(_,depth)=>point(column*48+depth*24,depth)))}/>)}
 </svg></div>;
}
