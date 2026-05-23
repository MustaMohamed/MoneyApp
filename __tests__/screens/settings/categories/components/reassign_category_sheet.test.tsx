/**
 * Task 7 — Group D2
 *
 * Tests for the migrated ReassignCategorySheet component.
 * Covers the Sheet migration from react-native-actions-sheet to the §3 Sheet primitive.
 *
 * Strategy: the component's internal Zustand store (useReassignCategorySheetState)
 * is mocked at module level so renders don't trigger the "getSnapshot must be cached"
 * infinite-loop known in RNTL + Zustand + useShallow passthrough. The real store
 * shape is tested exhaustively in __tests__/reassign_category_sheet.state.test.ts.
 *
 * Acceptance criteria covered:
 * TC-T7-01 — sheet renders subtitle using categoriesReassignSubtitle(linkedCount)
 * TC-T7-02 — sheet renders singular "1 transaction will be moved" when linkedCount = 1
 * TC-T7-03 — sheet renders plural "N transactions will be moved" when linkedCount > 1
 * TC-T7-04 — sheet title uses categoriesReassignTitle(categoryName)
 * TC-T7-05 — category options rendered with correct names
 * TC-T7-06 — CTA disabled when no selection
 * TC-T7-07 — CTA enabled after option selected
 * TC-T7-08 — onConfirm called with selected option id when CTA pressed
 * TC-T7-09 — onCancel called and state reset when sheet closes
 * TC-T7-10 — does not render when visible = false
 * TC-T7-11 — renders when visible = true
 */

// ---------------------------------------------------------------------------
// Mock declarations — hoisted
// ---------------------------------------------------------------------------
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');
jest.mock('heroui-native', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' '),
}));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));

// Mock the sheet state store — prevents RNTL infinite-loop with real Zustand stores.
// We expose capturable mock fns via module-level variables updated per test.
let mockSelectedId: string | null = null;
let mockIsLoading = false;
const mockSetSelectedId = jest.fn((id: string | null) => {
  mockSelectedId = id;
});
const mockSetIsLoading = jest.fn((v: boolean) => {
  mockIsLoading = v;
});
const mockReset = jest.fn(() => {
  mockSelectedId = null;
  mockIsLoading = false;
});

jest.mock('@/screens/settings/categories/components/reassign_category_sheet.state', () => ({
  useReassignCategorySheetState: jest.fn((selector: any) =>
    selector({
      state: { selectedId: mockSelectedId, isLoading: mockIsLoading },
      setSelectedId: mockSetSelectedId,
      setIsLoading: mockSetIsLoading,
      reset: mockReset,
    }),
  ),
}));

// Attach getState().reset() used inside handleClose
const mockGetState = {
  reset: jest.fn(() => {
    mockSelectedId = null;
    mockIsLoading = false;
  }),
};

import { act, fireEvent, render } from '@testing-library/react-native';
// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------
import React from 'react';

import { SHEET_FOOTER_CLEARANCE } from '@/components/ui/sheet';
import { Strings } from '@/constants/strings';
import { ReassignCategorySheet } from '@/screens/settings/categories/components/reassign_category_sheet';
import { useReassignCategorySheetState } from '@/screens/settings/categories/components/reassign_category_sheet.state';
import type { Category } from '@/store/category.store';

// Attach getState to the mock (used by handleClose in the component)
(useReassignCategorySheetState as any).getState = () => mockGetState;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const makeCategory = (id: string, name: string): Category => ({
  id,
  name,
  type: 'expense' as any,
  icon: 'food-fork-drink',
  color: '#C9973A',
  is_default: 0,
  sort_order: 1,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
});

const OPTION_A = makeCategory('cat_food', 'Food');
const OPTION_B = makeCategory('cat_transport', 'Transport');

const defaultProps = {
  visible: true,
  categoryName: 'Shopping',
  linkedCount: 5,
  options: [OPTION_A, OPTION_B],
  onConfirm: jest.fn().mockResolvedValue(undefined),
  onCancel: jest.fn(),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderSheet(overrides: Partial<typeof defaultProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  return render(<ReassignCategorySheet {...props} />);
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------
beforeEach(() => {
  jest.clearAllMocks();
  mockSelectedId = null;
  mockIsLoading = false;
  // Re-apply getState after clearAllMocks
  (useReassignCategorySheetState as any).getState = () => mockGetState;
});

// ---------------------------------------------------------------------------
// TC-T7-10 — Not visible
// ---------------------------------------------------------------------------
describe('ReassignCategorySheet — not visible (TC-T7-10)', () => {
  it('does not render bottom sheet when visible=false', () => {
    const { queryByTestId } = renderSheet({ visible: false });
    expect(queryByTestId('bottom-sheet')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// TC-T7-11 — Visible / renders
// ---------------------------------------------------------------------------
describe('ReassignCategorySheet — visible (TC-T7-11)', () => {
  it('renders bottom sheet when visible=true', () => {
    const { getByTestId } = renderSheet({ visible: true });
    expect(getByTestId('bottom-sheet')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// TC-T7-04 — Sheet title
// ---------------------------------------------------------------------------
describe('ReassignCategorySheet — title (TC-T7-04)', () => {
  it('renders categoriesReassignTitle with categoryName', () => {
    const { getByText } = renderSheet({ categoryName: 'Shopping', visible: true });
    expect(getByText(Strings.categoriesReassignTitle('Shopping'))).toBeTruthy();
  });

  it('renders title for a different categoryName', () => {
    const { getByText } = renderSheet({ categoryName: 'Travel', visible: true });
    expect(getByText(Strings.categoriesReassignTitle('Travel'))).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// TC-T7-01 / TC-T7-02 / TC-T7-03 — Subtitle
// ---------------------------------------------------------------------------
describe('ReassignCategorySheet — subtitle (TC-T7-01, TC-T7-02, TC-T7-03)', () => {
  it('renders subtitle with categoriesReassignSubtitle(5) for plural', () => {
    const { getByText } = renderSheet({ linkedCount: 5, visible: true });
    expect(getByText(Strings.categoriesReassignSubtitle(5))).toBeTruthy();
  });

  it('renders singular "1 transaction will be moved" when linkedCount = 1 (TC-T7-02)', () => {
    const { getByText } = renderSheet({ linkedCount: 1, visible: true });
    expect(getByText('1 transaction will be moved')).toBeTruthy();
  });

  it('renders plural "47 transactions will be moved" when linkedCount = 47 (TC-T7-03)', () => {
    const { getByText } = renderSheet({ linkedCount: 47, visible: true });
    expect(getByText('47 transactions will be moved')).toBeTruthy();
  });

  it('renders correct subtitle when linkedCount = 0', () => {
    const { getByText } = renderSheet({ linkedCount: 0, visible: true });
    expect(getByText(Strings.categoriesReassignSubtitle(0))).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// TC-T7-05 — Category options rendered
// ---------------------------------------------------------------------------
describe('ReassignCategorySheet — option list (TC-T7-05)', () => {
  it('renders option names for each category', () => {
    const { getByText } = renderSheet({ visible: true });
    expect(getByText('Food')).toBeTruthy();
    expect(getByText('Transport')).toBeTruthy();
  });

  it('renders body text above the list', () => {
    const { getByText } = renderSheet({ visible: true });
    expect(getByText(Strings.categoriesReassignBody)).toBeTruthy();
  });

  it('renders an empty list when options is empty', () => {
    const { getByText, queryByText } = renderSheet({ visible: true, options: [] });
    expect(getByText(Strings.categoriesReassignBody)).toBeTruthy();
    expect(queryByText('Food')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// TC-T7-06 — CTA disabled when no selection
// ---------------------------------------------------------------------------
describe('ReassignCategorySheet — CTA disabled state (TC-T7-06)', () => {
  it('CTA accessibilityState.disabled is true when selectedId is null', () => {
    mockSelectedId = null;
    const { getByTestId } = renderSheet({ visible: true });
    expect(getByTestId('reassign-cta').props.accessibilityState?.disabled).toBe(true);
  });

  it('CTA accessibilityState.disabled is true when isLoading is true even with a selection', () => {
    mockSelectedId = 'cat_food';
    mockIsLoading = true;
    const { getByTestId } = renderSheet({ visible: true });
    expect(getByTestId('reassign-cta').props.accessibilityState?.disabled).toBe(true);
  });

  it('CTA does not call onConfirm when no selection (behavior guard)', async () => {
    mockSelectedId = null;
    const onConfirm = jest.fn();
    const { getByTestId } = renderSheet({ visible: true, onConfirm });
    await act(async () => {
      fireEvent.press(getByTestId('reassign-cta'));
    });
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// TC-T7-07 — CTA enabled when selection made
// ---------------------------------------------------------------------------
describe('ReassignCategorySheet — CTA enabled after selection (TC-T7-07)', () => {
  it('CTA accessibilityState.disabled is false when selectedId is set and not loading', () => {
    mockSelectedId = 'cat_food';
    mockIsLoading = false;
    const { getByTestId } = renderSheet({ visible: true });
    expect(getByTestId('reassign-cta').props.accessibilityState?.disabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// TC-T7-08 — onConfirm called with selected id
// ---------------------------------------------------------------------------
describe('ReassignCategorySheet — onConfirm (TC-T7-08)', () => {
  it('calls onConfirm with the selected category id when CTA pressed', async () => {
    mockSelectedId = 'cat_food';
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = renderSheet({ visible: true, onConfirm });

    await act(async () => {
      fireEvent.press(getByTestId('reassign-cta'));
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith('cat_food');
  });

  it('calls onConfirm with second option id when that is selected', async () => {
    mockSelectedId = 'cat_transport';
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = renderSheet({ visible: true, onConfirm });

    await act(async () => {
      fireEvent.press(getByTestId('reassign-cta'));
    });

    expect(onConfirm).toHaveBeenCalledWith('cat_transport');
  });

  it('does not call onConfirm when CTA pressed without selection (selectedId null)', async () => {
    mockSelectedId = null;
    const onConfirm = jest.fn();
    const { getByTestId } = renderSheet({ visible: true, onConfirm });

    await act(async () => {
      fireEvent.press(getByTestId('reassign-cta'));
    });

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('calls setIsLoading(true) then setIsLoading(false) — finally block', async () => {
    mockSelectedId = 'cat_food';
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = renderSheet({ visible: true, onConfirm });

    await act(async () => {
      fireEvent.press(getByTestId('reassign-cta'));
    });

    expect(mockSetIsLoading).toHaveBeenNthCalledWith(1, true);
    expect(mockSetIsLoading).toHaveBeenNthCalledWith(2, false);
  });

  it('calls setIsLoading(false) in finally block after a successful confirm', async () => {
    mockSelectedId = 'cat_food';
    // Verify the finally block always resets loading — successful path
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = renderSheet({ visible: true, onConfirm });

    await act(async () => {
      fireEvent.press(getByTestId('reassign-cta'));
    });

    // setIsLoading called twice: true (start) and false (finally)
    expect(mockSetIsLoading).toHaveBeenCalledTimes(2);
    expect(mockSetIsLoading).toHaveBeenNthCalledWith(1, true);
    expect(mockSetIsLoading).toHaveBeenNthCalledWith(2, false);
  });

  it('calls setSelectedId(null) after confirm completes', async () => {
    mockSelectedId = 'cat_food';
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = renderSheet({ visible: true, onConfirm });

    await act(async () => {
      fireEvent.press(getByTestId('reassign-cta'));
    });

    expect(mockSetSelectedId).toHaveBeenCalledWith(null);
  });
});

// ---------------------------------------------------------------------------
// TC-T7-09 — onCancel / handleClose resets state
// ---------------------------------------------------------------------------
describe('ReassignCategorySheet — onCancel resets state (TC-T7-09)', () => {
  it('calls onCancel when sheet close button is pressed', () => {
    const onCancel = jest.fn();
    const { getByTestId } = renderSheet({ visible: true, onCancel });
    fireEvent.press(getByTestId('sheet-close-btn'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls getState().reset() before onCancel on sheet close', () => {
    const onCancel = jest.fn();
    const { getByTestId } = renderSheet({ visible: true, onCancel });
    fireEvent.press(getByTestId('sheet-close-btn'));
    expect(mockGetState.reset).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('reset is called before onCancel (ordering)', () => {
    const callOrder: string[] = [];
    mockGetState.reset.mockImplementation(() => callOrder.push('reset'));
    const onCancel = jest.fn(() => callOrder.push('onCancel'));
    const { getByTestId } = renderSheet({ visible: true, onCancel });
    fireEvent.press(getByTestId('sheet-close-btn'));
    expect(callOrder).toEqual(['reset', 'onCancel']);
  });
});

// ---------------------------------------------------------------------------
// Pressing an option calls setSelectedId with the correct id
// ---------------------------------------------------------------------------
describe('ReassignCategorySheet — option selection triggers setSelectedId', () => {
  it('pressing an option row calls setSelectedId with that option id', () => {
    const { getByText } = renderSheet({ visible: true });
    fireEvent.press(getByText('Food'));
    expect(mockSetSelectedId).toHaveBeenCalledWith('cat_food');
  });

  it('pressing second option calls setSelectedId with second option id', () => {
    const { getByText } = renderSheet({ visible: true });
    fireEvent.press(getByText('Transport'));
    expect(mockSetSelectedId).toHaveBeenCalledWith('cat_transport');
  });
});

// ---------------------------------------------------------------------------
// Strings unit tests — categoriesReassignSubtitle helper
// ---------------------------------------------------------------------------
describe('Strings.categoriesReassignSubtitle', () => {
  it('returns singular form for count = 1', () => {
    expect(Strings.categoriesReassignSubtitle(1)).toBe('1 transaction will be moved');
  });

  it('returns plural form for count = 0', () => {
    expect(Strings.categoriesReassignSubtitle(0)).toBe('0 transactions will be moved');
  });

  it('returns plural form for count = 2', () => {
    expect(Strings.categoriesReassignSubtitle(2)).toBe('2 transactions will be moved');
  });

  it('returns plural form for large counts', () => {
    expect(Strings.categoriesReassignSubtitle(999)).toBe('999 transactions will be moved');
  });
});

// ---------------------------------------------------------------------------
// Footer clearance: BottomSheetFlatList contentContainerStyle uses SHEET_FOOTER_CLEARANCE
// ---------------------------------------------------------------------------
describe('ReassignCategorySheet — footer clearance padding', () => {
  it('FlatList contentContainerStyle paddingBottom references SHEET_FOOTER_CLEARANCE', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path');
    const source: string = fs.readFileSync(
      path.resolve(
        __dirname,
        '../../../../../screens/settings/categories/components/reassign_category_sheet.tsx',
      ),
      'utf8',
    );
    expect(source).toContain('SHEET_FOOTER_CLEARANCE');
    expect(source).toContain('paddingBottom: SHEET_FOOTER_CLEARANCE');
  });

  it('SHEET_FOOTER_CLEARANCE is large enough to clear a CTA-height footer', () => {
    // Defensive: the clearance value must exceed ctaHeight (52px on a reference device)
    expect(SHEET_FOOTER_CLEARANCE).toBeGreaterThan(52);
  });
});

// ---------------------------------------------------------------------------
// Strings.categoriesReassignTitle helper
// ---------------------------------------------------------------------------
describe('Strings.categoriesReassignTitle', () => {
  it('wraps name in quotes', () => {
    expect(Strings.categoriesReassignTitle('Food')).toBe('"Food" has transactions');
  });

  it('handles different names', () => {
    expect(Strings.categoriesReassignTitle('Travel')).toBe('"Travel" has transactions');
  });
});
