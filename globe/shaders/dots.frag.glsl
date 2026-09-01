// Dotted globe — full world map, crisp round dots
uniform sampler2D landMask;
uniform float dotSize;
uniform float dotBrightness;
uniform float gridScale;
uniform vec3 dotColor;
uniform vec3 oceanColor;
uniform vec3 oceanNavy;

varying vec3 vNormal;
varying vec3 vObjectNormal;
varying vec3 vWorldPosition;
varying vec2 vUv;

float sampleLand(vec2 uv) {
  return smoothstep(0.06, 0.2, texture2D(landMask, uv).r);
}

float roundDot(vec2 p, float radius) {
  float d = length(p) - radius;
  return 1.0 - smoothstep(-0.018, 0.018, d);
}

void main() {
  vec2 maskUv = vec2(vUv.x, 1.0 - vUv.y);
  float land = sampleLand(maskUv);

  vec3 n = normalize(vObjectNormal);
  vec3 baseOcean = mix(oceanColor, oceanNavy, (1.0 - abs(n.y)) * 0.38);
  vec3 color = baseOcean;

  if (land > 0.08) {
    vec2 grid = maskUv * vec2(gridScale, gridScale * 0.5);
    vec2 cell = fract(grid) - 0.5;

    float dotVal = roundDot(cell, dotSize) * land * dotBrightness;

    if (dotVal > 0.03) {
      color = mix(baseOcean, dotColor * dotVal, clamp(dotVal, 0.0, 1.0));
    }
  }

  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  color += vec3(pow(1.0 - max(dot(vNormal, viewDir), 0.0), 4.0) * 0.02);

  gl_FragColor = vec4(color, 1.0);
}
