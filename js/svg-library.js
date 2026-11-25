// SVG templates use a 100 x 80 local coordinate system. Pin coordinates are in this same system.
export const SVG_TEMPLATES = {
  SOIC8: { name: "SOIC-8", width: 100, height: 80, pins: [
    {n:1,x:15,y:18},{n:2,x:15,y:33},{n:3,x:15,y:48},{n:4,x:15,y:63},
    {n:8,x:85,y:18},{n:7,x:85,y:33},{n:6,x:85,y:48},{n:5,x:85,y:63}
  ]},
  SOT23: { name: "SOT-23", width: 100, height: 80, pins: [
    {n:1,x:25,y:62},{n:2,x:75,y:62},{n:3,x:50,y:18}
  ]},
  RES2: { name: "Resistor / 2-pin", width: 100, height: 80, pins: [
    {n:1,x:15,y:40},{n:2,x:85,y:40}
  ]},
  QFN16: { name: "QFN-16", width: 100, height: 80, pins: [
    ...Array.from({length:4},(_,i)=>({n:i+1,x:20+i*20,y:8})),
    ...Array.from({length:4},(_,i)=>({n:5+i,x:92,y:20+i*15})),
    ...Array.from({length:4},(_,i)=>({n:9+i,x:80-i*20,y:72})),
    ...Array.from({length:4},(_,i)=>({n:13+i,x:8,y:60-i*15}))
  ]}
};
export function templateById(id) { return SVG_TEMPLATES[id] || SVG_TEMPLATES.RES2; }
