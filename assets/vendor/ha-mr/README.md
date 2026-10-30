Pinned upstream revision: `e1241f25f3e193b070acc0485288961ec11ce34f` of [p2r3/ha.mr](https://github.com/p2r3/ha.mr).
See LICENSE for the upstream license.

`compress.js` and `alphabets.js` are copied unchanged from `docs/`. Qrer loads them only when "Shorten via ha.mr" is ticked, and uses the QR alphabet. The bundled lean-qr copy is not included; Qrer's own encoder picks alphanumeric mode.
