/** Preview integration helper: call once after loading the SVG template. No app files are modified. */
export function installCassetteMascot(friend, template) {
 if (!friend || typeof friend.mascot !== 'function' || !template.includes('ef-cassette')) throw new Error('Expected the existing eFriend object and cassette SVG template');
 const previous=friend.mascot;let serial=0;
 const moods={comfortable:'cheer',done:'cheer',ontrack:'happy',tight:'meh',atrisk:'worried',unlikely:'worried',nodata:'meh',cheer:'cheer',happy:'happy',meh:'meh',worried:'worried'};
 friend.mascot=(verdict,size=72)=>{
  const mood=moods[verdict]||'happy', thinking=verdict==='thinking'?' ef-thinking':'',height=Number.isFinite(Number(size))?Math.min(1024,Math.max(16,Number(size))):72,prefix='efcassette-'+(++serial)+'-';
  let svg=template.replace('ef-cassette ef-happy"','ef-cassette ef-'+mood+thinking+'"').replace(/width="288" height="260"/,'width="'+(height*154/140)+'" height="'+height+'"');
  for(const match of [...svg.matchAll(/\bid="([^"]+)"/g)]){const id=match[1];svg=svg.replaceAll('id="'+id+'"','id="'+prefix+id+'"').replaceAll('url(#'+id+')','url(#'+prefix+id+')');}
  return svg;
 };
 return ()=>{friend.mascot=previous;};
}
