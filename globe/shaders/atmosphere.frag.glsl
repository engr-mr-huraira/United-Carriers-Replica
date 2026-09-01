// Unified globe atmosphere — cinematic orange rim + extended blue glow
uniform vec3 colorOrangeRim;
uniform vec3 colorOrangeCore;
uniform vec3 colorOrangeFade;
uniform vec3 colorBlueLower;
uniform vec3 colorBlueAtmo;
uniform vec3 colorBlueBloom;
uniform float intensity;

varying vec3 vViewNormal;
varying vec3 vViewPosition;
varying vec3 vWorldPosition;

void main() {
  vec3 worldN = normalize(vWorldPosition);
  vec3 n = normalize(vViewNormal);
  vec3 viewDir = normalize(-vViewPosition);

  float ndv = clamp(dot(n, viewDir), 0.0, 1.0);

  // Soft Fresnel for blue / general edge blend
  float fresnel = pow(1.0 - ndv, 1.45);
  fresnel = smoothstep(0.0, 1.0, fresnel);
  float edgeMix = mix(0.16, 1.0, fresnel);

  // Stronger Fresnel for orange — sharper, brighter sunrise rim
  float fresnelOrange = pow(1.0 - ndv, 2.45);
  fresnelOrange = smoothstep(0.0, 1.0, fresnelOrange);
  float orangeEdge = mix(0.1, 1.0, fresnelOrange);

  float hemiY = worldN.y;

  // Upper orange — ~25% thinner rim (steeper falloff from pole)
  float topMask = smoothstep(0.08, 0.78, hemiY);
  topMask = pow(topMask, 2.75);

  // Lower blue — tall light-blue to navy fade from bottom upward
  float botMask = smoothstep(-0.65, 0.98, -hemiY);
  botMask = pow(botMask, 0.45);

  // Orange ~35% brighter; blue unchanged relative boost
  float topGlow = topMask * orangeEdge * 1.38;
  float botGlow = botMask * edgeMix * 1.28;

  vec3 orangeCol = mix(colorOrangeFade, colorOrangeRim, pow(topMask, 0.7));
  orangeCol = mix(orangeCol, colorOrangeCore, fresnelOrange * topMask * 0.62);

  // Extended vertical gradient: bright blue edge → deep navy inward
  vec3 blueCol = mix(colorBlueLower, colorBlueAtmo, pow(botMask, 0.28));
  blueCol = mix(blueCol, colorBlueBloom, fresnel * botMask * 0.42);

  vec3 color = orangeCol * topGlow + blueCol * botGlow;

  float alpha = clamp((topGlow * 0.78 + botGlow * 0.8) * intensity, 0.0, 0.85);
  alpha += pow(fresnelOrange, 3.0) * 0.1 * topMask;
  alpha += pow(fresnel, 2.8) * 0.08 * botMask;

  if (alpha < 0.003) discard;
  gl_FragColor = vec4(color * intensity, alpha);
}
