"""Original hand-authored 24px sprite atlas. No downloaded or generated imagery."""
from PIL import Image,ImageDraw
from pathlib import Path
out=Path(__file__).resolve().parents[2]/'public/living-mine-beta/assets'
im=Image.new('RGBA',(24*16,24*2));d=ImageDraw.Draw(im)
def rect(x,y,w,h,c):d.rectangle((ox+x,oy+y,ox+x+w-1,oy+y+h-1),fill=c)
for row in range(2):
 for i in range(16):
  ox=i*24;oy=row*24
  if i<4: # miner frames
   rect(8,3,8,3,'#efb657');rect(6,6,12,2,'#c8803c');rect(9,8,6,5,'#e8bf95');rect(14,9,1,1,'#182231');rect(8,13,9,6,'#689caa');rect(9,19,3,4,'#394452');rect(14+(i%2),19,3,4,'#394452');rect(5,14,3,3,'#d3a374');rect(17,13,5,2,'#b9cbd0');rect(21,10+i%3,2,7,'#9c7352');rect(11,5,3,2,'#fff0b1')
  elif i==4: # cart
   rect(2,10,20,9,'#866345');rect(3,10,18,2,'#c99d60');rect(3,13,18,2,'#a47b4d');rect(5,6,5,4,'#697589');rect(10,4,6,6,'#80bcc6');rect(16,7,4,3,'#638494');rect(4,19,4,4,'#212839');rect(17,19,4,4,'#212839');rect(5,20,2,2,'#b3ad96');rect(18,20,2,2,'#b3ad96')
  elif i==5: # lantern
   rect(10,1,4,5,'#97754c');rect(6,6,12,2,'#bc884a');rect(7,8,10,11,'#6f5239');rect(9,9,6,8,'#ffd27c');rect(11,10,2,6,'#fff1b9');rect(6,19,12,3,'#ac7841')
  elif i in [6,7,8]: # crystal colors
   c=['#69dbe2','#b997ec','#8dbb80'][i-6]
   d.polygon([(ox+4,oy+18),(ox+6,oy+7),(ox+10,oy+3),(ox+14,oy+13),(ox+18,oy+6),(ox+21,oy+17),(ox+15,oy+22),(ox+7,oy+22)],fill=c);rect(8,9,2,9,'#c0eeed');rect(16,13,2,6,'#d9d0f5')
  elif i==9: # drill
   rect(2,14,16,7,'#516d79');rect(4,6,12,10,'#a78554');rect(5,8,10,2,'#e6b05e');rect(7,11,6,3,'#33434f');rect(18,12,3,6,'#bec8c6');rect(21,13,2,4,'#dce0d4');rect(3,21,4,2,'#202b38');rect(13,21,4,2,'#202b38')
  elif i>=10: # furniture props
   if i==10:rect(2,12,20,8,'#a2784d');rect(3,10,18,3,'#d0a266');rect(4,20,3,4,'#6e523c');rect(17,20,3,4,'#6e523c')
   if i==11:rect(3,3,18,19,'#6f5137');rect(5,5,14,15,'#a07a49');rect(6,9,12,2,'#dfbd74');rect(6,15,12,2,'#dfbd74')
   if i==12:rect(4,7,16,15,'#52656a');rect(6,9,12,11,'#252f3b');rect(8,13,8,7,'#e98449');rect(10,15,4,5,'#ffce77');rect(8,2,8,5,'#71838b')
   if i==13:rect(3,11,18,4,'#a88858');rect(5,15,3,7,'#7e5c3e');rect(16,15,3,7,'#7e5c3e');rect(6,7,9,4,'#c2d2c9')
   if i==14:rect(5,14,14,8,'#a47b53');rect(8,8,8,7,'#6b9d74');rect(4,5,9,6,'#8cbd86');rect(12,3,8,7,'#80ad7b')
   if i==15:rect(3,4,18,19,'#4a5c70');rect(5,6,14,15,'#263547');rect(8,8,8,2,'#9cc5c7');rect(8,12,8,2,'#e4b36e');rect(8,16,8,2,'#b78cda')
# lower row: reusable rock tiles, planks, support beams, rails
for i in range(16):
 ox=i*24;oy=24;rect(0,0,24,24,['#252f42','#263b39','#332d48','#443335'][i//4]);
 for x,y,w,h in [(1,2,10,7),(13,1,10,9),(2,12,7,10),(11,11,12,11)]:
  rect(x,y,w,h,['#303c50','#314a43','#403958','#554044'][i//4]);rect(x,y,w,1,['#3c485b','#41584b','#504563','#65504c'][i//4])
 rect(4+(i*3)%15,5+(i*7)%15,3,2,'#596071')
out.mkdir(parents=True,exist_ok=True);im.save(out/'atlas.png')
