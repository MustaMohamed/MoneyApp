import { BackHandler } from 'react-native';

export type BackHandlerSpy = jest.SpiedFunction<typeof BackHandler.addEventListener>;

export interface BackHandlerMock {
  spy: BackHandlerSpy;
  removeMocks: jest.Mock[];
}

export function installBackHandlerSpy(): BackHandlerMock {
  const removeMocks: jest.Mock[] = [];
  const spy = jest.spyOn(BackHandler, 'addEventListener').mockImplementation(() => {
    const remove = jest.fn();
    removeMocks.push(remove);
    return { remove };
  });
  return { spy, removeMocks };
}

export function pressBack(spy: BackHandlerSpy): boolean | null | undefined {
  const call = spy.mock.calls.at(-1);
  if (call === undefined) throw new Error('no hardware back listener was added');
  expect(call[0]).toBe('hardwareBackPress');
  return call[1]({ type: 'hardwareBackPress', timeStamp: 0 });
}
