import '@testing-library/jest-dom';
import { DocumentReference, DocumentSnapshot } from '@firebase/firestore-types';

declare global {
  namespace jest {
    interface Matchers<R> {
      toAllow(): Promise<R>;
      toDeny(): Promise<R>;
    }
  }
}

interface CustomMatchers<R = unknown> {
  toAllow(): R;
  toDeny(): R;
}

declare global {
  namespace jest {
    interface Expect extends CustomMatchers {}
    interface Matchers<R> extends CustomMatchers<R> {}
    interface InverseAsymmetricMatchers extends CustomMatchers {}
  }
}

expect.extend({
  async toAllow(received: Promise<any>) {
    try {
      await received;
      return {
        message: () => 'Operation was allowed',
        pass: true,
      };
    } catch (err) {
      return {
        message: () => `Operation was denied: ${err}`,
        pass: false,
      };
    }
  },

  async toDeny(received: Promise<any>) {
    try {
      await received;
      return {
        message: () => 'Operation was allowed but should have been denied',
        pass: false,
      };
    } catch (err) {
      return {
        message: () => 'Operation was denied as expected',
        pass: true,
      };
    }
  },
}); 