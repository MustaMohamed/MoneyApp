// Mocks for native modules used across tests. Individual test files can
// override these or supply richer fakes via jest.mock().

jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    setItemAsync: jest.fn(async (k, v) => {
      store.set(k, v);
    }),
    getItemAsync: jest.fn(async (k) => (store.has(k) ? store.get(k) : null)),
    deleteItemAsync: jest.fn(async (k) => {
      store.delete(k);
    }),
    __reset: () => store.clear(),
  };
});

jest.mock('expo-sqlite', () => {
  // Tests that need real SQL should override this mock with better-sqlite3
  // (see the moneyapp-testing skill and __tests__/transaction.repository.test.ts).
  // Default is a thin call-recording mock so unit tests don't crash if they
  // incidentally touch the DB.
  const calls = [];
  const fakeDb = {
    execAsync: jest.fn(async (sql) => {
      calls.push({ method: 'execAsync', sql });
    }),
    runAsync: jest.fn(async (...args) => {
      calls.push({ method: 'runAsync', args });
      return { changes: 1, lastInsertRowId: 1 };
    }),
    getAllAsync: jest.fn(async () => []),
    getFirstAsync: jest.fn(async () => null),
    withTransactionAsync: jest.fn(async (fn) => fn()),
  };
  return {
    openDatabaseAsync: jest.fn(async () => fakeDb),
    __fakeDb: fakeDb,
    __calls: calls,
    __reset: () => {
      calls.length = 0;
      fakeDb.execAsync.mockClear();
      fakeDb.runAsync.mockClear();
      fakeDb.getAllAsync.mockClear();
      fakeDb.getFirstAsync.mockClear();
      fakeDb.withTransactionAsync.mockClear();
    },
  };
});

jest.mock('react-native-uuid', () => ({
  __esModule: true,
  default: {
    v4: () => '00000000-0000-4000-8000-000000000000',
  },
}));

jest.mock('heroui-native', () => {
  const React = require('react');
  const { View, Text: RNText, TextInput } = require('react-native');

  const passThrough = (Component) =>
    React.forwardRef(({ children, ...props }, ref) =>
      React.createElement(Component, { ref, ...props }, children),
    );

  const TextField = passThrough(View);
  const Label = passThrough(RNText);
  const Description = passThrough(RNText);
  const FieldError = passThrough(RNText);
  const Input = passThrough(TextInput);
  const InputGroup = passThrough(View);
  InputGroup.Input = passThrough(TextInput);
  InputGroup.Prefix = passThrough(View);
  InputGroup.Suffix = passThrough(View);
  const Surface = passThrough(View);
  const Typography = passThrough(RNText);
  Typography.Heading = passThrough(RNText);
  Typography.Paragraph = passThrough(RNText);
  Typography.Code = passThrough(RNText);
  const PressableFeedback = passThrough(View);
  const Spinner = passThrough(View);

  const ListGroup = passThrough(View);
  ListGroup.Item = passThrough(View);
  ListGroup.ItemPrefix = passThrough(View);
  ListGroup.ItemContent = passThrough(View);
  ListGroup.ItemTitle = passThrough(RNText);
  ListGroup.ItemDescription = passThrough(RNText);
  ListGroup.ItemSuffix = passThrough(View);

  const RadioGroupContext = React.createContext({
    value: undefined,
    onValueChange: undefined,
  });
  function RadioGroup({ value, onValueChange, children, ...props }) {
    return React.createElement(
      RadioGroupContext.Provider,
      { value: { value, onValueChange } },
      React.createElement(View, { role: 'radiogroup', ...props }, children),
    );
  }
  RadioGroup.Item = ({ value, children, accessibilityState, ...props }) => {
    const group = React.useContext(RadioGroupContext);
    return React.createElement(
      View,
      {
        role: 'radio',
        accessibilityState: {
          ...accessibilityState,
          checked: group.value === value,
        },
        onPress: () => group.onValueChange?.(value),
        ...props,
      },
      typeof children === 'function'
        ? children({
            isSelected: group.value === value,
            isDisabled: false,
            isInvalid: false,
          })
        : children,
    );
  };
  const Radio = passThrough(View);
  Radio.Indicator = passThrough(View);
  Radio.IndicatorThumb = passThrough(View);

  const SearchFieldContext = React.createContext({ value: undefined, onChange: undefined });
  function SearchField({ value, onChange, children, ...props }) {
    return React.createElement(
      SearchFieldContext.Provider,
      { value: { value, onChange } },
      React.createElement(View, props, children),
    );
  }
  SearchField.Group = passThrough(View);
  SearchField.SearchIcon = passThrough(View);
  SearchField.Input = React.forwardRef((props, ref) => {
    const searchField = React.useContext(SearchFieldContext);
    return React.createElement(TextInput, {
      ref,
      accessibilityRole: 'search',
      value: searchField.value,
      onChangeText: searchField.onChange,
      ...props,
    });
  });
  SearchField.ClearButton = ({ onPress, accessibilityLabel = 'Clear search', ...props }) => {
    const searchField = React.useContext(SearchFieldContext);
    if (!searchField.value) return null;
    return React.createElement(View, {
      accessibilityRole: 'button',
      accessibilityLabel,
      onPress: (event) => {
        searchField.onChange?.('');
        onPress?.(event);
      },
      ...props,
    });
  };

  const Button = passThrough(View);
  Button.Label = passThrough(RNText);

  const Chip = passThrough(View);
  Chip.Label = passThrough(RNText);

  const Card = passThrough(View);
  Card.Header = passThrough(View);
  Card.Body = passThrough(View);
  Card.Title = passThrough(RNText);
  Card.Description = passThrough(RNText);
  Card.Footer = passThrough(View);

  const Alert = passThrough(View);
  Alert.Indicator = passThrough(View);
  Alert.Content = passThrough(View);
  Alert.Title = passThrough(RNText);
  Alert.Description = passThrough(RNText);

  const Separator = (props) => React.createElement(View, { testID: 'separator', ...props });

  // BottomSheet compound component mock.
  // Renders children when isOpen=true; calls onOpenChange(false) via Close.
  const BottomSheetPortal = ({ children }) => React.createElement(React.Fragment, null, children);
  const BottomSheetOverlay = () => null;
  const BottomSheetContent = ({ children }) =>
    React.createElement(View, { testID: 'bottom-sheet-content' }, children);
  const BottomSheetClose = ({ onPress }) =>
    React.createElement(View, { testID: 'bottom-sheet-close', onPress });
  const BottomSheetTitle = ({ children }) =>
    React.createElement(RNText, { testID: 'bottom-sheet-title' }, children);

  function BottomSheet({ isOpen, onOpenChange: _onOpenChange, children }) {
    if (!isOpen) return null;
    return React.createElement(View, { testID: 'heroui-bottom-sheet' }, children);
  }
  BottomSheet.Portal = BottomSheetPortal;
  BottomSheet.Overlay = BottomSheetOverlay;
  BottomSheet.Content = BottomSheetContent;
  BottomSheet.Close = BottomSheetClose;
  BottomSheet.Title = BottomSheetTitle;

  return {
    cn: (...args) => args.filter(Boolean).flat(Infinity).join(' '),
    Alert,
    BottomSheet,
    Button,
    Card,
    Chip,
    TextField,
    Input,
    InputGroup,
    Label,
    Description,
    FieldError,
    PressableFeedback,
    Radio,
    RadioGroup,
    SearchField,
    Spinner,
    ListGroup,
    Separator,
    Surface,
    Typography,
    useTextField: () => ({ isDisabled: false, isInvalid: false, isRequired: false }),
    useThemeColor: () => ['#D4A44C'],
  };
});

jest.mock('heroui-native/provider-raw', () => ({
  HeroUINativeProviderRaw: ({ children }) => children,
}));
