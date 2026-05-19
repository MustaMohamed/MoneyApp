import fs from 'fs';
import path from 'path';

import { render, fireEvent, act } from '@testing-library/react-native';
import React from 'react';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');
jest.mock('heroui-native', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));

// Mock react-native-gesture-handler — TouchableOpacity delegates to RN's
// TouchableOpacity so fireEvent.press works in tests.
jest.mock('react-native-gesture-handler', () => {
  const { TouchableOpacity } = require('react-native');
  return { TouchableOpacity };
});

// Uses the __mocks__/@gorhom/bottom-sheet.tsx mock automatically via moduleNameMapper.
// The mock renders children when index >= 0 and null when index < 0.
// It also exposes `bottomSheetMockMethods` — stable jest.fn() handles for the
// imperative ref methods Sheet calls via useEffect.

import { Sheet, SHEET_FOOTER_CLEARANCE } from '@/components/ui/sheet';
import { Colors } from '@/constants/theme';
// Import from the mock file directly so TypeScript resolves the correct types.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { bottomSheetMockMethods } =
  require('../../../__mocks__/@gorhom/bottom-sheet') as typeof import('../../../__mocks__/@gorhom/bottom-sheet');

const SHEET_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../../../components/ui/sheet.tsx'),
  'utf8',
);

// ---------------------------------------------------------------------------
// SHEET_FOOTER_CLEARANCE export
// ---------------------------------------------------------------------------
describe('SHEET_FOOTER_CLEARANCE', () => {
  it('is a positive number', () => {
    expect(typeof SHEET_FOOTER_CLEARANCE).toBe('number');
    expect(SHEET_FOOTER_CLEARANCE).toBeGreaterThan(0);
  });

  it('is at least Size.ctaHeight (52 px scaled) tall — enough to clear the sticky footer', () => {
    // The clearance must at minimum exceed the CTA height alone (ms(52)) so
    // the last piece of scrollable content is never hidden behind the footer.
    // On a reference device ms(52) = 52; SHEET_FOOTER_CLEARANCE is ms(52) + ms(48) = ms(100).
    expect(SHEET_FOOTER_CLEARANCE).toBeGreaterThanOrEqual(52);
  });
});

// ---------------------------------------------------------------------------
// Snap point mapping
// ---------------------------------------------------------------------------
describe('Sheet snap-point contract', () => {
  it('sm size passes ["50%"] snap point to BottomSheet', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path');
    const source: string = fs.readFileSync(
      path.resolve(__dirname, '../../../components/ui/sheet.tsx'),
      'utf8',
    );
    // Verify the sm snap point is 50%
    expect(source).toContain("sm: ['50%']");
  });

  it('lg size passes ["92%"] snap point to BottomSheet', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path');
    const source: string = fs.readFileSync(
      path.resolve(__dirname, '../../../components/ui/sheet.tsx'),
      'utf8',
    );
    // Verify the lg snap point was bumped from 85% → 92%
    expect(source).toContain("lg: ['92%']");
    expect(source).not.toContain("lg: ['85%']");
  });
});

describe('Sheet component', () => {
  it('renders children when visible is true', () => {
    const { getByText } = render(
      <Sheet visible={true} onClose={jest.fn()} size="sm">
        <Sheet.Body>
          <></>
        </Sheet.Body>
      </Sheet>,
    );
    // Sheet is open — the bottom-sheet mock renders children
    // We test via the bottom-sheet testID
    const { getByTestId } = render(
      <Sheet visible={true} onClose={jest.fn()} size="sm">
        <Sheet.Body>
          <></>
        </Sheet.Body>
      </Sheet>,
    );
    expect(getByTestId('bottom-sheet')).toBeTruthy();
  });

  it('does not render children when visible is false', () => {
    const { queryByTestId } = render(
      <Sheet visible={false} onClose={jest.fn()} size="sm">
        <Sheet.Body>
          <></>
        </Sheet.Body>
      </Sheet>,
    );
    // Mock returns null when index < 0
    expect(queryByTestId('bottom-sheet')).toBeNull();
  });

  it('renders title in header when title prop is provided', () => {
    const { getByText } = render(
      <Sheet visible={true} onClose={jest.fn()} title="My Sheet" size="sm">
        <Sheet.Body>
          <></>
        </Sheet.Body>
      </Sheet>,
    );
    expect(getByText('My Sheet')).toBeTruthy();
  });

  it('does not render header when title is omitted', () => {
    const { queryByTestId } = render(
      <Sheet visible={true} onClose={jest.fn()} size="sm">
        <Sheet.Body>
          <></>
        </Sheet.Body>
      </Sheet>,
    );
    expect(queryByTestId('sheet-header')).toBeNull();
  });

  it('calls onClose when the close button is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <Sheet visible={true} onClose={onClose} title="Close Me" size="sm">
        <Sheet.Body>
          <></>
        </Sheet.Body>
      </Sheet>,
    );
    fireEvent.press(getByTestId('sheet-close-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders footer when footer prop is provided', () => {
    const { getByTestId } = render(
      <Sheet visible={true} onClose={jest.fn()} size="sm" footer={<></>}>
        <Sheet.Body>
          <></>
        </Sheet.Body>
      </Sheet>,
    );
    expect(getByTestId('sheet-footer')).toBeTruthy();
  });

  it('does not render footer container when footer is omitted', () => {
    const { queryByTestId } = render(
      <Sheet visible={true} onClose={jest.fn()} size="sm">
        <Sheet.Body>
          <></>
        </Sheet.Body>
      </Sheet>,
    );
    expect(queryByTestId('sheet-footer')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Bug A — close button uses TouchableOpacity from react-native-gesture-handler
// (Round 7 approach). This ensures the gesture system on Android forwards
// touches to the button correctly when it sits directly inside BottomSheetLib
// without a BottomSheetView wrapper.
//
// If this still doesn't fix close on device, the next step is to switch to
// BottomSheetModal (Portal-based, fully isolated gesture stack). Flag to @tariq.
// ---------------------------------------------------------------------------
describe('Sheet close button — gesture-handler TouchableOpacity (Bug A)', () => {
  it('imports TouchableOpacity from react-native-gesture-handler', () => {
    expect(SHEET_SOURCE).toContain(
      "import { TouchableOpacity } from 'react-native-gesture-handler'",
    );
  });

  it('does NOT wrap the header in BottomSheetView (BottomSheetView wrap reverted)', () => {
    // BottomSheetView may still be imported for other uses but the header View
    // must NOT be wrapped in it — that pattern caused the layout regression
    // (header overlapping body) fixed in Round 7.
    // Verify the source does not contain the wrapping pattern.
    expect(SHEET_SOURCE).not.toMatch(/<BottomSheetView>\s*<View testID="sheet-header"/);
  });

  it('close button testID=sheet-close-btn fires onClose callback', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <Sheet visible={true} onClose={onClose} title="Test" size="sm">
        <Sheet.Body>
          <></>
        </Sheet.Body>
      </Sheet>,
    );
    fireEvent.press(getByTestId('sheet-close-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('sheet-header is a direct child of BottomSheet (not inside BottomSheetView)', () => {
    // Round 6 regression: BottomSheetView as sibling to Sheet.Body caused both
    // to flex:1 against each other and broke stacking order. Verifying the header
    // is NOT inside a bottom-sheet-view element guards against re-introducing this.
    const { getByTestId, queryByTestId } = render(
      <Sheet visible={true} onClose={jest.fn()} title="Layout Check" size="sm">
        <Sheet.Body>
          <></>
        </Sheet.Body>
      </Sheet>,
    );
    const header = getByTestId('sheet-header');
    // Walk up the parent chain — there must be no bottom-sheet-view ancestor.
    let current: any = header.parent;
    let foundBottomSheetView = false;
    while (current !== null && current !== undefined) {
      if (current.props?.testID === 'bottom-sheet-view') {
        foundBottomSheetView = true;
        break;
      }
      current = current.parent;
    }
    expect(foundBottomSheetView).toBe(false);
    // Also confirm the sheet itself is visible
    expect(queryByTestId('bottom-sheet')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Bug 2 — footer container has a solid background so scrolled content does
// not bleed through behind the sticky footer.
// ---------------------------------------------------------------------------
describe('Sheet footer background (Bug 2)', () => {
  it('footer container style includes backgroundColor matching sheet surface', () => {
    const { getByTestId } = render(
      <Sheet visible={true} onClose={jest.fn()} size="sm" footer={<></>}>
        <Sheet.Body>
          <></>
        </Sheet.Body>
      </Sheet>,
    );
    const footerEl = getByTestId('sheet-footer');
    const flatStyle = Array.isArray(footerEl.props.style)
      ? Object.assign({}, ...footerEl.props.style)
      : footerEl.props.style;
    expect(flatStyle.backgroundColor).toBe(Colors.dark.surface);
  });
});

// ---------------------------------------------------------------------------
// Round 8 — imperative ref sync via useEffect
//
// @gorhom/bottom-sheet v5 treats `index` as initial-only in many code paths.
// Sheet must imperatively call sheetRef.current?.close() / .snapToIndex(0)
// to reliably drive open/close state.
// ---------------------------------------------------------------------------
describe('Sheet imperative ref sync (Round 8)', () => {
  beforeEach(() => {
    bottomSheetMockMethods.close.mockClear();
    bottomSheetMockMethods.snapToIndex.mockClear();
  });

  it('calls snapToIndex(0) on the ref when visible changes from false to true', () => {
    const { rerender } = render(
      <Sheet visible={false} onClose={jest.fn()} size="sm">
        <Sheet.Body>
          <></>
        </Sheet.Body>
      </Sheet>,
    );
    // Clear after initial mount so we only assert the transition call.
    bottomSheetMockMethods.snapToIndex.mockClear();
    bottomSheetMockMethods.close.mockClear();

    act(() => {
      rerender(
        <Sheet visible={true} onClose={jest.fn()} size="sm">
          <Sheet.Body>
            <></>
          </Sheet.Body>
        </Sheet>,
      );
    });

    expect(bottomSheetMockMethods.snapToIndex).toHaveBeenCalledWith(0);
    expect(bottomSheetMockMethods.close).not.toHaveBeenCalled();
  });

  it('calls close() on the ref when visible changes from true to false', () => {
    const { rerender } = render(
      <Sheet visible={true} onClose={jest.fn()} size="sm">
        <Sheet.Body>
          <></>
        </Sheet.Body>
      </Sheet>,
    );
    // Clear after initial mount so we only assert the transition call.
    bottomSheetMockMethods.snapToIndex.mockClear();
    bottomSheetMockMethods.close.mockClear();

    act(() => {
      rerender(
        <Sheet visible={false} onClose={jest.fn()} size="sm">
          <Sheet.Body>
            <></>
          </Sheet.Body>
        </Sheet>,
      );
    });

    expect(bottomSheetMockMethods.close).toHaveBeenCalledTimes(1);
    expect(bottomSheetMockMethods.snapToIndex).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Round 8 cleanup — diagnostic console.log removed
// ---------------------------------------------------------------------------
describe('Sheet diagnostic cleanup (Round 8)', () => {
  it('does not contain the round-7 diagnostic console.log', () => {
    expect(SHEET_SOURCE).not.toContain('[Sheet] close button pressed');
  });

  it('does not contain the TODO(round-7) comment', () => {
    expect(SHEET_SOURCE).not.toContain('TODO(round-7)');
  });
});
