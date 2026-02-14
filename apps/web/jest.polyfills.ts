try {
  const util = require('util');
  (global as any).TextEncoder = (global as any).TextEncoder || util.TextEncoder;
  (global as any).TextDecoder = (global as any).TextDecoder || util.TextDecoder;

  try {
    const webStreams = require('stream/web');
    (global as any).ReadableStream = (global as any).ReadableStream || webStreams.ReadableStream;
    (global as any).WritableStream = (global as any).WritableStream || webStreams.WritableStream;
    (global as any).TransformStream = (global as any).TransformStream || webStreams.TransformStream;
  } catch (e) {
    // noop
  }

  if (!(global as any).fetch || !(global as any).Request || !(global as any).Response || !(global as any).Headers) {
    const undici = require('undici');
    (global as any).fetch = (global as any).fetch || undici.fetch;
    (global as any).Request = (global as any).Request || undici.Request;
    (global as any).Response = (global as any).Response || undici.Response;
    (global as any).Headers = (global as any).Headers || undici.Headers;
  }
} catch (e) {
  // noop
}
