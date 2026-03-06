import{j as t}from"./react-CNH-fRtN.js";function s({colors:r=["#7c3aed","#06b6d4","#1e1b4b"]}){return t.jsxs("div",{style:{position:"absolute",inset:0,overflow:"hidden",zIndex:0},children:[r.map((e,a)=>t.jsx("div",{style:{position:"absolute",borderRadius:"50%",filter:"blur(80px)",opacity:.3,background:e,width:`${40+a*20}%`,height:`${40+a*20}%`,top:`${10+a*20}%`,left:`${a*25}%`,animation:`aurora-float-${a} ${6+a*2}s ease-in-out infinite alternate`}},a)),t.jsx("style",{children:`
        @keyframes aurora-float-0 { from { transform: translate(0,0) scale(1); } to { transform: translate(30px,-20px) scale(1.1); } }
        @keyframes aurora-float-1 { from { transform: translate(0,0) scale(1); } to { transform: translate(-20px,30px) scale(1.05); } }
        @keyframes aurora-float-2 { from { transform: translate(0,0) scale(1); } to { transform: translate(20px,10px) scale(1.15); } }
      `})]})}export{s as A};
