import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ListGroup, Separator } from 'heroui-native';
import { Fragment } from 'react';

import { Sheet } from '@/components/ui/sheet';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import type { Budget } from '@/modules/budget/entities/budget.entity';
import { formatAmount } from '@/utils/format_amount';
import { ms } from '@/utils/responsive';

interface BudgetPickerSheetProps {
  isOpen: boolean;
  budgets: Budget[];
  selectedId: string | undefined;
  onSelect: (budget: Budget) => void;
  onOpenChange: (open: boolean) => void;
}

export function BudgetPickerSheet(props: BudgetPickerSheetProps) {
  return (
    <Sheet
      isOpen={props.isOpen}
      onOpenChange={props.onOpenChange}
      title={Strings.addTxPickBudgetTitle}
      size="xs"
    >
      <ListGroup variant="transparent" className="mx-4">
        {props.budgets.map((budget, index) => (
          <Fragment key={budget.id}>
            <ListGroup.Item onPress={() => props.onSelect(budget)}>
              <ListGroup.ItemPrefix>
                <MaterialCommunityIcons
                  name="wallet-outline"
                  size={ms(18)}
                  color={Colors.dark.gold}
                />
              </ListGroup.ItemPrefix>
              <ListGroup.ItemContent>
                <ListGroup.ItemTitle>{budget.name}</ListGroup.ItemTitle>
                <ListGroup.ItemDescription>
                  {`${formatAmount(budget.limit_amount)} ${Strings.currencyEgp}`}
                </ListGroup.ItemDescription>
              </ListGroup.ItemContent>
              <ListGroup.ItemSuffix>
                {props.selectedId === budget.id ? (
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={ms(18)}
                    color={Colors.dark.positive}
                  />
                ) : (
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={ms(18)}
                    color={Colors.dark.text2}
                  />
                )}
              </ListGroup.ItemSuffix>
            </ListGroup.Item>
            {index < props.budgets.length - 1 ? <Separator className="mx-4" /> : null}
          </Fragment>
        ))}
      </ListGroup>
    </Sheet>
  );
}
