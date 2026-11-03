# Third-party browser assets

## hls.js 1.7.3

- Purpose: HLS (`.m3u8`) playback on browsers with Media Source Extensions, including supported Chrome and Edge versions. Safari may use native HLS instead.
- Upstream: <https://github.com/video-dev/hls.js>
- Official package metadata: <https://registry.npmjs.org/hls.js/1.7.3>
- Official npm archive: <https://registry.npmjs.org/hls.js/-/hls.js-1.7.3.tgz>
- Version checked against the official npm `latest` endpoint on 2026-10-19 (Asia/Shanghai); this project pins version **1.7.3**.
- License: Apache-2.0. The upstream license and notices are preserved at `src/main/resources/static/assets/vendor/hls.js.LICENSE`.
- Vendored production file: `src/main/resources/static/assets/vendor/hls.min.js` (619,692 bytes).
- No CDN request is required to load the player library.

The downloaded npm archive was verified against its official SHA-512 integrity value before extraction:

```text
sha512-MsPlx6yVW4Qv4C7mEVou4/gk/5cN2dVxOTnrNjPSmyH2f0Ln+/UkG10Ax1PE6OvrmTVPKgQYozTtBaPOuCzq7A==
```

The vendored `hls.min.js` SHA-256 is:

```text
a12e7ee1cd64a69dcdb314157e45dafcba705bfb0b1440b7935cb265d374423e
```

The library does not supply a live stream. Playback still requires an accessible configured source URL, compatible codecs, server CORS settings and any provider authorization. No stream URLs or credentials are bundled.

Java dependencies are declared in `pom.xml` and resolved by Maven. Their licenses are defined by their respective upstream distributions; the packaged executable JAR contains the dependency artifacts and their notices.
