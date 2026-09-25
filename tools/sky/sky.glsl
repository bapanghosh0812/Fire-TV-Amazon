#version 300 es
// Storyloom cinematic sky: physically based atmosphere, volumetric clouds, a
// procedural cratered moon, a star field with the Milky Way, layered mountains
// and a reflective lake. Rendered offline on a GPU into seamless video loops.
precision highp float;
out vec4 fragColor;

uniform vec2 uRes;
uniform vec4 uTile;        // x0, y0, w, h of this tile in full-frame pixels
uniform float uTime;       // seconds into the loop
uniform float uLoop;       // loop length (s): every periodic motion completes whole cycles
uniform float uFade;       // crossfade length (s) that hides the cloud drift at the seam
uniform vec2 uBodyScreen;  // sun or moon position on screen (0..1, y down)
uniform float uNight;      // 0 = sun lights the scene, 1 = moon
uniform float uExposure;
uniform float uCoverage;   // cumulus coverage 0..1
uniform float uCloudDensity;
uniform float uCirrus;     // high cirrus amount
uniform float uStars;
uniform float uHaze;       // Mie haze multiplier
uniform float uMist;       // lake mist amount
uniform vec3 uGrade;       // colour grade (multiplier)
uniform float uSaturation;
uniform float uWind;       // m/s
uniform float uSeed;
uniform float uBodyRadius; // degrees
uniform float uFireflies;
uniform float uMaxOut;     // eye-comfort ceiling for the brightest pixel

const float PI = 3.14159265359;
const float R0 = 6360e3;
const float RA = 6420e3;
const float CAMH = 22.0;
const float CB = 1500.0;   // cumulus base
const float CT = 3600.0;   // cumulus top
const vec3 BR = vec3(5.8e-6, 13.5e-6, 33.1e-6);
const float HR = 8000.0;
const float HM = 1200.0;
const vec3 BO = vec3(0.650e-6, 1.881e-6, 0.085e-6);
float ozone(float h) { return max(0., 1. - abs(h - 25000.) / 15000.); }
const float FOVY = 0.87266;  // 50 degrees
const float PITCH = 0.12217; // 7 degrees up

// ------------------------------------------------------------------ hashes / noise
float hash11(float p) { p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float hash13(vec3 p3) { p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
vec3 hash33(vec3 p3) { p3 = fract(p3 * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yxx) * p3.zyx); }
vec2 hash22(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }

float gnoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  vec3 u = f * f * f * (f * (f * 6. - 15.) + 10.);
  #define G(o) dot(hash33(i + o) * 2. - 1., f - o)
  float n = mix(mix(mix(G(vec3(0,0,0)), G(vec3(1,0,0)), u.x), mix(G(vec3(0,1,0)), G(vec3(1,1,0)), u.x), u.y),
                mix(mix(G(vec3(0,0,1)), G(vec3(1,0,1)), u.x), mix(G(vec3(0,1,1)), G(vec3(1,1,1)), u.x), u.y), u.z);
  #undef G
  return n; // about -0.7..0.7
}

float vnoise2(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}

float fbm2(vec2 p, int oct) {
  float a = 0.5, s = 0.;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 8; i++) { if (i >= oct) break; s += a * vnoise2(p); p = m * p; a *= 0.5; }
  return s;
}

float fbm3(vec3 p, int oct) {
  float a = 0.5, s = 0.;
  for (int i = 0; i < 8; i++) { if (i >= oct) break; s += a * gnoise(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; }
  return s;
}

float worley(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  float d = 1.;
  for (int x = -1; x <= 1; x++)
    for (int y = -1; y <= 1; y++)
      for (int z = -1; z <= 1; z++) {
        vec3 o = vec3(x, y, z);
        vec3 r = o + hash33(i + o) - f;
        d = min(d, dot(r, r));
      }
  return sqrt(d);
}

float remap(float v, float l0, float h0, float l1, float h1) { return l1 + (v - l0) * (h1 - l1) / (h0 - l0); }

// ------------------------------------------------------------------ camera
vec3 camRay(vec2 uv) { // uv 0..1, y down
  vec2 ndc = vec2(uv.x * 2. - 1., 1. - uv.y * 2.);
  float ty = tan(FOVY * .5);
  vec3 d = normalize(vec3(ndc.x * ty * uRes.x / uRes.y, ndc.y * ty, -1.));
  float c = cos(PITCH), s = sin(PITCH);
  return vec3(d.x, d.y * c - d.z * s, d.y * s + d.z * c);
}

float pixelAngle() { return FOVY / uRes.y; }

// ------------------------------------------------------------------ atmosphere
vec2 raySphere(vec3 ro, vec3 rd, float r) {
  float b = dot(ro, rd), c = dot(ro, ro) - r * r, d = b * b - c;
  if (d < 0.) return vec2(-1.);
  d = sqrt(d);
  return vec2(-b - d, -b + d);
}

float phaseR(float mu) { return 3. / (16. * PI) * (1. + mu * mu); }
float phaseHG(float mu, float g) { float g2 = g * g; return (1. - g2) / (4. * PI * pow(1. + g2 - 2. * g * mu, 1.5)); }
float phaseM(float mu, float g) { float g2 = g * g; return 3. / (8. * PI) * ((1. - g2) * (1. + mu * mu)) / ((2. + g2) * pow(1. + g2 - 2. * g * mu, 1.5)); }

vec3 BM() { return vec3(21e-6 * uHaze); }

// Optical depth from p toward L (for sun colour / shadows).
vec3 transmittance(vec3 p, vec3 L) {
  vec2 ia = raySphere(p, L, RA);
  if (raySphere(p, L, R0).x > 0.) return vec3(0.);
  float len = ia.y, ds = len / 8.;
  float odR = 0., odM = 0., odO = 0.;
  for (int i = 0; i < 8; i++) {
    vec3 q = p + L * (ds * (float(i) + .5));
    float h = length(q) - R0;
    odR += exp(-h / HR) * ds;
    odM += exp(-h / HM) * ds;
    odO += ozone(h) * ds;
  }
  return exp(-(BR * odR + BM() * 1.1 * odM + BO * odO));
}

// Cheap cloud shadow lookup used by the god rays.
float cloudShadowAt(vec3 p, vec3 L, float t);

// Single scattering sky (Nishita) with crepuscular shafts from cloud shadows.
vec3 atmosphere(vec3 ro, vec3 rd, vec3 L, float Lint, float tMax, bool shafts, float t) {
  vec2 ia = raySphere(ro, rd, RA);
  float len = min(ia.y, tMax);
  vec2 ig = raySphere(ro, rd, R0);
  if (ig.x > 0.) len = min(len, ig.x);
  const int N = 20;
  float ds = len / float(N);
  float mu = dot(rd, L);
  vec3 sumR = vec3(0.), sumM = vec3(0.);
  float odR = 0., odM = 0., odO = 0.;
  for (int i = 0; i < N; i++) {
    float s = ds * (float(i) + .5);
    vec3 p = ro + rd * s;
    float h = length(p) - R0;
    float hr = exp(-h / HR) * ds, hm = exp(-h / HM) * ds;
    odR += hr; odM += hm; odO += ozone(h) * ds;
    vec3 tl = transmittance(p, L);
    float sh = 1.;
    if (shafts && h < CB && s < 60000.) sh = mix(1., cloudShadowAt(p, L, t), 1. - smoothstep(.06, .22, L.y));
    vec3 att = exp(-(BR * odR + BM() * 1.1 * odM + BO * odO)) * tl * sh;
    sumR += att * hr;
    sumM += att * hm;
  }
  return Lint * (sumR * BR * phaseR(mu) + sumM * BM() * phaseM(mu, 0.8));
}

// ------------------------------------------------------------------ clouds
vec2 windOffset(float t) { return vec2(1., 0.35) * uWind * t; }

float gClear = 1.; // coverage multiplier for the current view ray

float weatherAt(vec2 xz, float t) {
  vec2 q = (xz + windOffset(t) * .6) / 16000.;
  float w = fbm2(q + uSeed * 3.1, 4);
  return clamp(uCoverage + (w - .5) * 1.6, 0., 1.) * gClear;
}

float cloudMap(vec3 p, float h01, float t, bool detail) {
  if (h01 < 0. || h01 > 1.) return 0.;
  float cov = weatherAt(p.xz, t);
  if (cov < 0.02) return 0.;
  vec2 w = windOffset(t);
  vec3 q = vec3(p.x + w.x, p.y - R0, p.z + w.y) / 2000.;
  q.y += t * 0.0025; // slow boiling
  float per = fbm3(q + uSeed, 4) + .5;
  float wor = 1. - worley(q * 1.8);
  float base = remap(per, -(1. - wor) * .55, 1., 0., 1.);
  base = clamp(base, 0., 1.);
  // Cumulus profile: flat bases, rounded tops.
  float grad = smoothstep(0., .1, h01) * smoothstep(1., .55, h01);
  base *= grad;
  float d = remap(base, 1. - cov, 1., 0., 1.) * cov;
  if (d <= 0.) return 0.;
  if (detail) {
    vec3 dq = q * 5.3 + vec3(0., t * 0.01, 0.);
    float det = .625 * (1. - worley(dq)) + .25 * (1. - worley(dq * 2.1)) + .125 * (1. - worley(dq * 4.3));
    det = mix(det, 1. - det, clamp(h01 * 4., 0., 1.));
    d = remap(d, det * .22, 1., 0., 1.);
  }
  return clamp(d, 0., 1.) * uCloudDensity;
}

float shellH(vec3 p) { return (length(p) - (R0 + CB)) / (CT - CB); }

float cloudShadowAt(vec3 p, vec3 L, float t) {
  gClear = 1.;
  vec2 ic = raySphere(p, L, R0 + CB + (CT - CB) * .4);
  if (ic.y < 0.) return 1.;
  vec3 q = p + L * ic.y;
  float d = cloudMap(q, .4, t, false);
  return exp(-d * 5.5);
}

float lightMarch(vec3 p, vec3 L, float t) {
  float sum = 0., ds = 90.;
  for (int i = 0; i < 6; i++) {
    vec3 q = p + L * ds * (float(i) + .5);
    sum += cloudMap(q, shellH(q), t, false) * ds;
    ds *= 1.6;
  }
  return sum * .3;
}

vec3 bodyDir();
vec4 clouds(vec3 ro, vec3 rd, vec3 L, vec3 lightCol, vec3 ambTop, vec3 ambBot, float t, int steps, float jitter, out float depth) {
  depth = 1e9;
  if (raySphere(ro, rd, R0).x > 0.) return vec4(0., 0., 0., 1.);
  float bodyAng = acos(clamp(dot(rd, bodyDir()), -1., 1.));
  gClear = smoothstep(radians(uBodyRadius) * 1.4, radians(uBodyRadius) * 3.2 + .28, bodyAng);
  float ts = raySphere(ro, rd, R0 + CB).y;
  float te = raySphere(ro, rd, R0 + CT).y;
  te = min(te, ts + 70000.);
  if (ts > 140000.) return vec4(0., 0., 0., 1.);
  float dt = (te - ts) / float(steps);
  float mu = dot(rd, L);
  float ph = mix(phaseHG(mu, .78), phaseHG(mu, -.28), .35) * 4. * PI;
  float T = 1.;
  vec3 S = vec3(0.);
  float x = ts + dt * jitter;
  float wsum = 0., dsum = 0.;
  const float SIG = 0.045;
  for (int i = 0; i < 96; i++) {
    if (i >= steps) break;
    vec3 p = ro + rd * x;
    float h = shellH(p);
    float d = cloudMap(p, h, t, steps > 40);
    if (d > .002) {
      float ld = lightMarch(p, L, t);
      // Multiple-scattering approximation (Wrenninge): three weaker, wider octaves.
      float lum = 0., a = 1., b = 1., c = 1.;
      for (int o = 0; o < 3; o++) {
        lum += b * exp(-ld * SIG * a) * mix(1., ph, c);
        a *= .25; b *= .6; c *= .5;
      }
      float powder = 1. - exp(-d * 2.2 * dt * SIG * 4.);
      vec3 amb = mix(ambBot, ambTop, clamp(h, 0., 1.)) * (.35 + .65 * h) * .45;
      vec3 Lc = lightCol * (mix(1.05, 1.5, smoothstep(.35, .05, L.y)) / PI) * lum * mix(.55, 1., powder) * (uNight > .5 ? 3.5 : 1.) + amb;
      float ext = max(d * SIG, 1e-5);
      float Ts = exp(-ext * dt);
      S += T * Lc * (1. - Ts);
      wsum += T * (1. - Ts); dsum += T * (1. - Ts) * x;
      T *= Ts;
      if (T < .01) break;
    }
    x += dt;
  }
  depth = wsum > 0. ? dsum / wsum : 1e9;
  return vec4(S, T);
}

vec4 cirrus(vec3 ro, vec3 rd, vec3 L, vec3 lightCol, vec3 amb, float t) {
  if (uCirrus <= 0. || rd.y < 0.) return vec4(0.);
  float tc = raySphere(ro, rd, R0 + 8200.).y;
  vec3 p = ro + rd * tc;
  vec2 uv = (p.xz + windOffset(t) * 2.5) / vec2(20000., 11000.);
  uv = mat2(.8, -.6, .6, .8) * uv;
  float n = fbm2(uv * 1.3 + uSeed, 6);
  float streak = fbm2(vec2(uv.x * .35, uv.y * 3.) + 7., 5);
  float d = smoothstep(.48, .8, n * .6 + streak * .55) * uCirrus;
  d *= smoothstep(95000., 30000., tc);
  float mu = dot(rd, L);
  vec3 col = lightCol * (1. / PI) * (.35 + 2.4 * phaseHG(mu, .7) * 4. * PI * .18) + amb * .5;
  return vec4(col * d, d * .75);
}

// ------------------------------------------------------------------ celestial bodies
vec3 bodyDir() { return camRay(uBodyScreen); }

vec3 sunDisk(vec3 rd, vec3 L, vec3 sunCol) {
  float ang = acos(clamp(dot(rd, L), -1., 1.));
  float R = radians(uBodyRadius);
  float aa = pixelAngle() * 1.5;
  float disk = smoothstep(R + aa, R - aa, ang);
  float r = clamp(ang / R, 0., 1.);
  float limb = .45 + .55 * pow(max(1. - r * r, 0.), .35);
  vec3 c = sunCol * disk * limb * 60.;
  // Glare and bloom around the sun.
  c += sunCol * (3.2 * exp(-ang * 40.) + .7 * exp(-ang * 11.) + .12 * exp(-ang * 3.5));
  c += vec3(1., .78, .5) * length(sunCol) * (.35 * exp(-ang * 26.) + .05 * exp(-ang * 7.));
  return c;
}

// Procedural moon: maria, craters with rims, ray systems and Lommel-Seeliger shading.
float craterField(vec3 n, float scale, float seed, out float rays) {
  vec3 p = n * scale;
  vec3 i = floor(p), f = fract(p);
  float h = 0.;
  rays = 0.;
  for (int x = -1; x <= 1; x++)
    for (int y = -1; y <= 1; y++)
      for (int z = -1; z <= 1; z++) {
        vec3 o = vec3(x, y, z);
        vec3 rnd = hash33(i + o + seed);
        vec3 c = o + rnd - f;
        float rad = .18 + .3 * hash13(i + o + seed + 7.1);
        float d = length(c) / rad;
        if (d < 2.4) {
          float bowl = d < 1. ? (d * d - 1.) * .9 : 0.;
          float rim = .35 * exp(-pow((d - 1.) / .18, 2.));
          float ejecta = d > 1. ? .08 * exp(-(d - 1.) * 2.) : 0.;
          h += (bowl + rim + ejecta) * rad;
          if (rnd.x > .93 && d > 1.) rays += exp(-(d - 1.) * 1.1) * pow(abs(sin(atan(c.y, c.x) * 11. + rnd.y * 20.)), 12.) * .6;
        }
      }
  return h;
}

float moonHeight(vec3 n, out float albedo) {
  float mar = fbm3(n * 1.7 + 11.3, 5);
  float maria = smoothstep(.02, .2, mar);
  float r1, r2, r3;
  float h = craterField(n, 3.2, 1.3, r1) * .9 + craterField(n, 8.5, 4.7, r2) * .45 + craterField(n, 22., 9.1, r3) * .2;
  h *= mix(1., .45, maria); // maria are smoother
  float speck = fbm3(n * 40., 3);
  albedo = mix(.92, .52, maria) * (.9 + .12 * speck) + (r1 + r2 * .5) * .35;
  return h + fbm3(n * 60., 2) * .04;
}

vec4 moonDisk(vec3 rd, vec3 M) {
  vec3 w = M;
  vec3 u = normalize(cross(vec3(0., 1., 0.), w));
  vec3 v = cross(w, u);
  float R = radians(uBodyRadius);
  vec2 q = vec2(dot(rd, u), dot(rd, v)) / sin(R);
  float r = length(q);
  float aa = pixelAngle() * 1.5 / R;
  float mask = smoothstep(1. + aa, 1. - aa, r) * step(0., dot(rd, w));
  if (mask <= 0.) return vec4(0.);
  vec3 n = vec3(q, sqrt(max(1. - dot(q, q), 0.)));
  // Rotate the surface a little so it isn't perfectly face-on (libration).
  float a = .35, b = -.2;
  mat3 rot = mat3(cos(a), 0., -sin(a), 0., 1., 0., sin(a), 0., cos(a)) * mat3(1., 0., 0., 0., cos(b), sin(b), 0., -sin(b), cos(b));
  vec3 ns = rot * n;
  float alb;
  float h = moonHeight(ns, alb);
  // Normal from the height field (finite differences on the sphere).
  float e = .004, tmp;
  vec3 tx = normalize(cross(vec3(0., 1., 0.), n) + 1e-4);
  vec3 ty = cross(n, tx);
  float hx = moonHeight(normalize(rot * (n + tx * e)), tmp);
  float hy = moonHeight(normalize(rot * (n + ty * e)), tmp);
  vec3 nn = normalize(n - (tx * (hx - h) + ty * (hy - h)) / e * .018);
  vec3 Ls = normalize(vec3(.52, .12, .85)); // lit from the right and behind the viewer: waxing gibbous
  float mu0 = max(dot(nn, Ls), 0.);
  float mu = max(n.z, 1e-3);
  float ls = 2. * mu0 / (mu0 + mu);
  float lit = mix(ls, mu0 * 1.6, .38) * smoothstep(-.02, .08, dot(n, Ls));
  vec3 col = vec3(1.0, .97, .92) * alb * lit;
  col += vec3(.35, .45, .6) * alb * .018; // earthshine on the dark side
  return vec4(col * mask, mask);
}

vec3 moonGlow(vec3 rd, vec3 M) {
  float ang = acos(clamp(dot(rd, M), -1., 1.));
  float R = radians(uBodyRadius);
  float x = max(ang - R, 0.);
  return vec3(.55, .66, .9) * (.5 * exp(-x * 22.) + .14 * exp(-x * 5.5) + .04 * exp(-x * 1.6));
}

// ------------------------------------------------------------------ stars & milky way
vec3 starColor(float k) {
  return k < .3 ? mix(vec3(.62, .74, 1.), vec3(1.), k / .3) : mix(vec3(1.), vec3(1., .78, .52), (k - .3) / .7);
}

vec3 starLayer(vec3 rd, float scale, float thresh, float size, float gain, float seed, float t) {
  vec3 p = rd * scale;
  vec3 id = floor(p);
  vec3 col = vec3(0.);
  float pa = pixelAngle();
  for (int x = -1; x <= 1; x++)
    for (int y = -1; y <= 1; y++)
      for (int z = -1; z <= 1; z++) {
        vec3 c = id + vec3(x, y, z);
        float h = hash13(c + seed);
        if (h < thresh) continue;
        vec3 sp = normalize(c + .2 + .6 * hash33(c + seed + 3.3));
        float d = length(cross(rd, sp));
        float mag = pow((h - thresh) / (1. - thresh), 4.);
        float rad = pa * (size + mag * .9);
        float b = exp(-pow(d / rad, 2.)) * (.2 + mag * 3.);
        float k = floor(hash11(h * 91.7) * 6.) + 3.; // whole cycles per loop
        float tw = 1. + .4 * sin(2. * PI * k * t / uLoop + h * 60.) * (.4 + .6 * hash11(h * 13.1));
        col += starColor(hash11(h * 47.3)) * b * tw * gain;
      }
  return col;
}

vec3 GAL = normalize(vec3(-.62, .52, .58)); // galactic pole: the band crosses the sky diagonally

vec3 milkyWay(vec3 rd) {
  float g = dot(rd, GAL);
  float band = exp(-pow(g / .2, 2.));
  if (band < .01) return vec3(0.);
  vec3 q = rd * 5.;
  float n = fbm3(q + 2.1, 6) + .5;
  float dust = smoothstep(.35, .8, fbm3(rd * 9. + 5.3, 5) + .5) * exp(-pow(g / .07, 2.));
  float core = exp(-pow(length(rd - normalize(vec3(-.55, .15, -.8))) / .55, 2.));
  vec3 c = mix(vec3(.55, .62, .85), vec3(1., .86, .68), core) * band * n * (.5 + core);
  c *= 1. - dust * .85;
  // Faint emission nebulae inside the band.
  float neb = smoothstep(.55, .9, fbm3(rd * 3.2 + 17., 5) + .5) * band;
  c += vec3(.9, .35, .55) * neb * .35 + vec3(.25, .55, .75) * smoothstep(.6, .95, fbm3(rd * 4.1 + 31., 4) + .5) * band * .25;
  return c * .09;
}

vec3 stars(vec3 rd, float t) {
  if (rd.y < -.02) return vec3(0.);
  vec3 c = vec3(0.);
  float band = exp(-pow(dot(rd, GAL) / .22, 2.));
  c += starLayer(rd, 150., .972, .32, .45, 1.7, t);
  c += starLayer(rd, 320., .986 - band * .02, .28, .22 + band * .3, 5.9, t);
  c += starLayer(rd, 70., .992, .5, 1.1, 9.3, t);
  c += milkyWay(rd);
  // Stars dim and redden near the horizon (extinction).
  float ext = smoothstep(-.01, .25, rd.y);
  return c * ext * vec3(1., mix(.8, 1., ext), mix(.65, 1., ext));
}

// Shooting stars: two meteors per loop, in screen space.
vec3 meteors(vec2 uv, float t) {
  vec3 c = vec3(0.);
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    float start = uFade + 2. + fi * (uLoop - uFade - 5.) * .55 + hash11(fi + uSeed) * 2.;
    float dur = .9;
    float k = (t - start) / dur;
    if (k < 0. || k > 1.) continue;
    vec2 a = vec2(.18 + .35 * hash11(fi * 3.1 + uSeed), .08 + .12 * hash11(fi * 5.7));
    vec2 dir = normalize(vec2(1., .42 + .2 * hash11(fi * 9.9)));
    vec2 head = a + dir * k * .32;
    vec2 asp = vec2(uRes.x / uRes.y, 1.);
    vec2 d = (uv - head) * asp;
    float along = dot(d, -dir * asp / length(dir * asp));
    vec2 perp = d - (-dir * asp / length(dir * asp)) * along;
    float tail = along > 0. ? exp(-along / .09) : exp(along / .004);
    float w = exp(-pow(length(perp) / .0016, 2.));
    float env = sin(PI * k);
    c += vec3(.85, .92, 1.) * tail * w * env * 2.2;
  }
  return c;
}

// ------------------------------------------------------------------ terrain
// Ridge heights are elevation angles (radians) as a function of azimuth.
float ridge(float az, float freq, float amp, float base, float seed) {
  float x = az * freq + seed;
  float h = 0., a = 1., f = 1., norm = 0.;
  for (int i = 0; i < 7; i++) {
    float n = vnoise2(vec2(x * f, seed * 1.7 + float(i) * 5.3));
    n = 1. - abs(n * 2. - 1.); // ridged
    h += a * n * n; norm += a;
    a *= .5; f *= 2.1;
  }
  return base + amp * h / norm;
}

float azOf(vec3 rd) { return atan(rd.x, -rd.z); }
float elOf(vec3 rd) { return asin(clamp(rd.y, -1., 1.)); }

float layerHeight(int i, float az, float bodyAz) {
  float dip = 1. - .65 * exp(-pow((az - bodyAz) / .16, 2.)); // a valley where the sun sets
  if (i == 0) return ridge(az, 2.2, radians(4.6), radians(.5), 3.1 + uSeed) * mix(1., dip, .6);
  if (i == 1) return ridge(az, 3.1, radians(3.4), radians(.35), 7.7 + uSeed) * dip;
  if (i == 2) return ridge(az, 4.6, radians(2.0), radians(.2), 12.9 + uSeed) * mix(dip, 1., .3);
  // Near shore: low hills with a conifer tree line, open in the middle for the reflection.
  float side = smoothstep(.05, .32, abs(az - bodyAz * .4 + .05));
  float hill = ridge(az, 7., radians(.7), radians(.06), 21.3 + uSeed) * side;
  float x = az * 150.;
  float c = floor(x);
  float tree = 0.;
  for (int k = -2; k <= 2; k++) {
    float id = c + float(k);
    if (hash11(id * 1.37 + 5.) < .22) continue;
    float cx = id + .5 + (hash11(id * 2.1) - .5) * .7;
    float h = .3 + .55 * hash11(id * 3.7) * hash11(id * 8.9 + 1.);
    float w = .38 + .3 * hash11(id * 4.3);
    float dx = abs(x - cx) / w;
    if (dx > 1.) continue;
    float y = 1. - dx;
    float tiers = 5. + floor(3. * hash11(id * 6.1));
    float saw = fract(y * tiers);
    y = y - .16 * saw * (1. - y) ;
    tree = max(tree, h * max(y, 0.) * (1. + .15 * (1. - dx)));
  }
  return hill + tree * radians(1.05) * side;
}

const float LAYER_DIST[4] = float[4](52000., 24000., 9500., 1400.);

// Coverage of a ridge for this ray (anti-aliased), plus its slope for lighting.
float layerCover(int i, vec3 rd, float bodyAz, out float slope) {
  float az = azOf(rd), el = elOf(rd);
  float pa = pixelAngle();
  float top = layerHeight(i, az, bodyAz);
  float e = .002;
  slope = (layerHeight(i, az + e, bodyAz) - layerHeight(i, az - e, bodyAz)) / (2. * e);
  return smoothstep(top + pa * .7, top - pa * .7, el);
}

// ------------------------------------------------------------------ scene
struct Light { vec3 L; float Lint; vec3 col; vec3 ambTop; vec3 ambBot; vec3 horizon; };

Light makeLight(float t) {
  Light l;
  vec3 ro = vec3(0., R0 + CAMH, 0.);
  l.L = bodyDir();
  if (uNight > .5) {
    l.L = normalize(l.L + vec3(0., .05, 0.));
    l.Lint = 20. * .0022;
  } else {
    l.Lint = 20.;
  }
  l.col = l.Lint * transmittance(ro, l.L);
  l.ambTop = atmosphere(ro, vec3(0., 1., 0.), l.L, l.Lint, 1e9, false, t) * 2.2;
  vec3 hz = normalize(vec3(.3, .06, -1.));
  l.horizon = atmosphere(ro, hz, l.L, l.Lint, 1e9, false, t);
  l.ambBot = mix(l.horizon, l.ambTop, .4) * .9;
  return l;
}

vec3 nightBase(vec3 rd) {
  // A little airglow and twilight blue so the night sky is never flat black.
  float h = max(rd.y, 0.);
  vec3 zen = vec3(.0012, .0022, .008);
  vec3 hor = vec3(.006, .011, .026);
  vec3 c = mix(hor, zen, pow(h, .45));
  c += vec3(.02, .028, .018) * exp(-h * 18.) * .5; // faint green/orange airglow
  return c;
}

vec3 sky(vec3 rd, Light lt, float t, bool reflection, float jitter, vec2 uv) {
  vec3 ro = vec3(0., R0 + CAMH, 0.);
  vec3 B = bodyDir();
  vec3 base = atmosphere(ro, rd, lt.L, lt.Lint, 1e9, !reflection && uNight < .5, t);
  if (uNight > .5) base += nightBase(rd);
  vec3 c = base;
  // Stars and the Milky Way sit behind everything.
  if (uStars > 0.) c += stars(rd, t) * uStars * (reflection ? .35 : 1.);
  // Sun or moon.
  if (uNight > .5) {
    vec4 m = moonDisk(rd, B);
    c = mix(c, m.rgb * .62, m.a);
    c += moonGlow(rd, B) * .22;
  } else {
    c += sunDisk(rd, B, lt.col * .05);
  }
  // High cirrus, then cumulus.
  vec4 ci = cirrus(ro, rd, lt.L, lt.col, lt.ambTop, t);
  c = mix(c, ci.rgb / max(ci.a, 1e-3), ci.a * (1. - (uNight > .5 ? .2 : 0.)));
  float depth;
  vec3 lightCol = lt.col;
  vec4 cl = clouds(ro, rd, lt.L, lightCol, lt.ambTop, lt.ambBot, t, reflection ? 40 : 72, jitter, depth);
  // Aerial perspective on the clouds.
  float fog = 1. - exp(-depth / (reflection ? 30000. : 42000.) * mix(1., 1.6, uHaze - 1.));
  vec3 cloudCol = mix(cl.rgb, base * (1. - cl.a), clamp(fog, 0., 1.) * .85);
  c = c * cl.a + cloudCol;
  return c;
}

vec3 terrainColor(int layer, float slope, vec3 rd, Light lt, float t) {
  vec3 ro = vec3(0., R0 + CAMH, 0.);
  // Surface lit from the light's side; slope gives the rim light on ridges.
  float lightAz = azOf(lt.L);
  float side = sign(lightAz - azOf(rd));
  float facing = clamp(.5 + .5 * slope * side * 1.8, 0., 1.);
  vec3 albedo = layer == 3 ? vec3(.02, .034, .026) : layer == 2 ? vec3(.045, .06, .055) : vec3(.07, .075, .08);
  vec3 lit = lt.col * .045 * facing * max(lt.L.y + .15, 0.) + lt.ambTop * .09 + lt.horizon * .04;
  vec3 col = albedo * lit * (uNight > .5 ? 4. : 1.);
  // Snow-dusted peaks catch the light on the farthest range.
  if (layer == 0) {
    float el = elOf(rd);
    float top = layerHeight(0, azOf(rd), azOf(bodyDir()));
    float snow = smoothstep(radians(2.6), radians(4.2), top) * smoothstep(top - radians(1.1), top - radians(.1), el);
    col += lt.col * .012 * snow * (.4 + .6 * facing) + lt.ambTop * .05 * snow;
  }
  // Aerial perspective: distant ranges fade into the haze colour.
  float dist = LAYER_DIST[layer];
  vec3 haze = atmosphere(ro, rd, lt.L, lt.Lint, dist, false, t);
  float vis = uNight > .5 ? 60000. : 38000. / uHaze;
  float k = 1. - exp(-dist / vis);
  vec3 skyBehind = uNight > .5 ? nightBase(rd) : vec3(0.);
  col = col * (1. - k) + haze + skyBehind * k * .6;
  return col;
}

// Lake ripples: two layers of drifting noise, cross-faded so the motion loops perfectly.
float rippleH(vec2 p, float foot) {
  float h = 0., a = 1., f = 1.;
  for (int i = 0; i < 5; i++) {
    float wl = 3.2 / f;
    float keep = smoothstep(foot * 1.5, foot * 5., wl);
    h += a * keep * gnoise(vec3(p * f * .32, float(i) * 7.3));
    a *= .5; f *= 2.;
  }
  return h;
}

vec3 waterNormal(vec2 p, float dist, float foot, float t) {
  vec2 v = vec2(.35, .9);
  float ph = t / uLoop;
  float f1 = fract(ph), f2 = fract(ph + .5);
  float w1 = 1. - abs(f1 * 2. - 1.), w2 = 1. - abs(f2 * 2. - 1.);
  vec2 o1 = v * f1 * uLoop, o2 = v * f2 * uLoop + 37.;
  float e = max(foot * .5, .02);
  vec2 g = vec2(0.);
  for (int k = 0; k < 2; k++) {
    vec2 o = k == 0 ? o1 : o2;
    float w = k == 0 ? w1 : w2;
    float h0 = rippleH(p + o, foot);
    g += w * vec2(rippleH(p + o + vec2(e, 0.), foot) - h0, rippleH(p + o + vec2(0., e), foot) - h0) / e;
  }
  g *= .06 / (1. + dist * .0015);
  return normalize(vec3(-g.x, 1., -g.y));
}

vec3 mist(vec3 rd, Light lt, float t, vec2 uv) {
  if (uMist <= 0.) return vec3(0.);
  float el = elOf(rd);
  float band = exp(-pow((el - radians(.25)) / radians(1.1), 2.));
  vec2 q = vec2(azOf(rd) * 6. + windOffset(t).x * .0008, el * 40.);
  float n = fbm2(q + uSeed, 5);
  vec3 col = lt.horizon * 1.4 + lt.col * .004;
  return col * band * smoothstep(.35, .75, n) * uMist;
}

vec3 fireflies(vec2 uv, float t) {
  if (uFireflies <= 0.) return vec3(0.);
  vec3 c = vec3(0.);
  vec2 asp = vec2(uRes.x / uRes.y, 1.);
  for (int i = 0; i < 26; i++) {
    float fi = float(i);
    float side = hash11(fi * 1.3) < .55 ? .06 + .22 * hash11(fi * 2.1) : .72 + .25 * hash11(fi * 2.9);
    vec2 base = vec2(side, .6 + .12 * hash11(fi * 4.7));
    float k1 = floor(1. + 3. * hash11(fi * 5.1)), k2 = floor(1. + 3. * hash11(fi * 6.3));
    vec2 pos = base + vec2(.035 * sin(2. * PI * k1 * t / uLoop + fi), .02 * sin(2. * PI * k2 * t / uLoop + fi * 2.));
    float pulse = pow(.5 + .5 * sin(2. * PI * floor(2. + 4. * hash11(fi * 8.8)) * t / uLoop + fi * 3.), 3.);
    float d = length((uv - pos) * asp);
    c += vec3(1., .9, .45) * (exp(-pow(d / .0022, 2.)) * 1.4 + exp(-d / .008) * .12) * pulse;
  }
  return c * uFireflies;
}

// Sky plus mountain ranges, composited far to near.
vec3 scenery(vec3 rd, Light lt, float t, bool reflection, float jitter, vec2 uv, float bodyAz) {
  float slope;
  float near = layerCover(3, rd, bodyAz, slope);
  float nearSlope = slope;
  vec3 col = vec3(0.);
  if (near < 1.) {
    col = sky(rd, lt, t, reflection, jitter, uv);
    for (int i = 0; i < 3; i++) {
      float c = layerCover(i, rd, bodyAz, slope);
      if (c > 0.) col = mix(col, terrainColor(i, slope, rd, lt, t), c);
    }
  }
  if (near > 0.) col = mix(col, terrainColor(3, nearSlope, rd, lt, t), near);
  return col;
}

vec3 render(vec2 uv, float t, float jitter) {
  vec3 rd = camRay(uv);
  Light lt = makeLight(t);
  float bodyAz = azOf(bodyDir());
  vec3 col;
  if (rd.y > -.0005) {
    col = scenery(rd, lt, t, false, jitter, uv, bodyAz);
    col += mist(rd, lt, t, uv);
  } else {
    // Lake: mirror of the sky and mountains with animated waves.
    vec3 ro = vec3(0., CAMH, 0.);
    float dist = CAMH / -rd.y;
    vec3 p = ro + rd * dist;
    float foot = dist * pixelAngle() / max(-rd.y, .012);
    vec3 n = waterNormal(p.xz, dist, foot, t);
    vec3 r = reflect(rd, n);
    r.y = abs(r.y) + .0004;
    vec3 refl = scenery(r, lt, t, true, jitter, uv, bodyAz);
    float fres = .02 + .98 * pow(1. - max(dot(-rd, n), 0.), 5.);
    fres = mix(fres, 1., .06);
    vec3 deep = lt.ambTop * vec3(.05, .09, .1) + lt.col * .0025 * vec3(.2, .45, .5) + vec3(.001, .003, .005);
    col = mix(deep, refl, fres);
    // Sun or moon glitter path.
    vec3 B = bodyDir();
    float spec = pow(max(dot(r, B), 0.), uNight > .5 ? 420. : 700.);
    col += (uNight > .5 ? vec3(.8, .88, 1.) * .12 : lt.col * .004) * spec * fres * 6.;
    // Low mist drifting over the far water (patches follow the water surface, not screen columns).
    if (uMist > 0.) {
      vec2 mq = (p.xz + windOffset(t) * 1.5) / vec2(420., 160.);
      float patchy = smoothstep(.35, .8, fbm2(mq + uSeed, 5));
      col += (lt.horizon * 1.2 + lt.col * .003) * patchy * uMist * .55 * smoothstep(250., 2200., dist);
    }
  }
  if (uNight > .5) col += meteors(uv, t) * uStars;
  col += fireflies(uv, t);
  return col;
}

vec3 aces(vec3 x) { return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }

void main() {
  vec2 px = gl_FragCoord.xy + uTile.xy;
  vec2 uv = vec2(px.x / uRes.x, 1. - px.y / uRes.y);
  float jitter = hash12(px + 17.3);
  vec3 c = render(uv, uTime, jitter);
  if (uTime < uFade) {
    // Seamless loop: blend with the frame one loop later while the clouds catch up.
    vec3 c2 = render(uv, uTime + uLoop, jitter);
    float k = smoothstep(0., 1., uTime / uFade);
    c = mix(c2, c, k);
  }
  c *= uExposure;
  c = aces(c);
  float l = dot(c, vec3(.2126, .7152, .0722));
  c = mix(vec3(l), c, uSaturation) * uGrade;
  c = pow(max(c, 0.), vec3(1. / 2.2));
  // Cinematic vignette and an eye-comfort ceiling for dark rooms.
  vec2 v = uv - .5;
  c *= 1. - .28 * pow(dot(v, v) * 1.6, 1.3);
  c = min(c, vec3(uMaxOut));
  // Dither to stop banding in the smooth gradients.
  c += (hash12(px + 91.7) + hash12(px * 1.37 + 4.1) - 1.) / 255.;
  fragColor = vec4(c, 1.);
}
