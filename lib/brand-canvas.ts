import {brandAssets} from './brand-identity';
/** Draw the original artwork rather than maintaining a second, differently colored mark. */
export async function drawBrandLogo(context:Pick<CanvasRenderingContext2D,'drawImage'>,x:number,y:number,size:number){
 const image=new Image();
 await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error('Could not load the CALBOK logo. Try copying the summary instead.'));image.src=brandAssets.logo;});
 context.drawImage(image,x,y,size,size);
}
