import * as React from 'react';
import { connect } from '../../utils/connect';
import { Button } from '../../utils/forms/Buttons';
import { Loadable, loadablifyLight } from '../../utils/loadable';
import { ModalOpenerProps, ModalProps } from '../../utils/modal';
import { CreateMTAllocateForm$Props } from '../order/mtOrderFormView';
import { prepareReAllocationRequest } from '../plan/planRebalance';
import { MTAccount, MTAccountState } from '../state/mtAccount';
import { MTAllocateState } from './mtOrderAllocateDebtForm';
import { ReallocateFormView } from './mtOrderAllocateDebtFormView';

export class ReallocateView extends React.Component<
  Loadable<MTAccount> &
  ModalOpenerProps & CreateMTAllocateForm$Props>
{
  public render() {
    return (
      <div style={{ marginBottom: '1em', marginRight: '1em' }}>
        <Button size="lg" color="white"
          onClick={() => this.rebalance()}
          disabled={
            this.props.status === 'loaded' &&
            this.props.value!.state !== MTAccountState.setup}
            style={{ fontSize: '15px' }}>
          Rebalance
        </Button>
      </div>
    );
  }

  private rebalance() {
    if (!this.props.value || this.props.value.state === MTAccountState.notSetup) {
      return;
    }

    const allocateForm$ = this.props.createMTAllocateForm$(
      this.props.value.proxy,
      prepareReAllocationRequest(this.props.value)
    );

    this.props.open(
      connect<Loadable<MTAllocateState>, ModalProps>(
        ReallocateFormView,
        loadablifyLight(allocateForm$)
      )
    );
  }
}
