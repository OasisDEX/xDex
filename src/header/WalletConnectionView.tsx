import classnames from 'classnames';
import * as React from 'react';
import { BehaviorSubject } from 'rxjs';
import { executeWeb3StatusCommand, WalletType, Web3StatusCommandKind } from '../blockchain/web3';
import { Button } from '../utils/forms/Buttons';
import { Checkbox } from '../utils/forms/Checkbox';
import { LoadingIndicator } from '../utils/loadingIndicator/LoadingIndicator';
import {
  getCurrentProviderName,
  Ledger,
  Metamask,
  Provider,
  Trezor, WalletConnect,
  WalletLink
} from '../utils/providers';
import * as styles from './WalletConnection.scss';

const hwWallets = [Trezor, Ledger];

const {
  section,
  heading,
  icon,
  list,
  single,
  item,
  wallet,
  inactive,
  selected,
  termsAndConditions,
  buttonPlaceholder,
} = styles;

const ListItem = (props: Provider & {
  className?: string,
  isSelected?: boolean,
  onSelect?: () => void, tid?: string
}) => {
  const {
    supported,
    isSelected,
    className,
    name: fullName,
    icon: walletIcon,
    onSelect,
    tid
  } = props;
  return (
    <li className={
      classnames(
        item, wallet, className,
        !supported && inactive,
        isSelected && selected
      )
    }
        onClick={onSelect}
        data-test-id={tid}
    >
      <div className={icon}>{walletIcon}</div>
      <span>{fullName}</span>
    </li>
  );
};

const Panel = (props: { heading?: string | React.ReactNode, children?: any }) => {
  return (
    <section data-test-id="wallet-connection-panel" className={section}>
      <h4 data-test-id="heading" className={heading}>{props.heading}</h4>
      {
        props.children
      }
    </section>
  );
};

class NotConnected extends React.Component<{}, { isChecked: boolean, walletType?: WalletType }> {
  public constructor(props: any) {
    super(props);
    this.state = {
      isChecked: false,
      walletType: undefined
    };
  }

  public render() {
    const provider = getCurrentProviderName();
    return (
      <Panel heading="Connect Wallet">
        <ul className={classnames(single, list)}>
          <ListItem icon={Metamask.icon}
                    name={Metamask.name}
                    supported={true}
                    isSelected={this.state.walletType === WalletType.browser}
                    onSelect={() => this._selectWallet(WalletType.browser)}
                    tid="web-wallet"
          />
          <ListItem icon={WalletLink.icon}
                    name={WalletLink.name}
                    supported={true}
                    isSelected={this.state.walletType === WalletType.walletLink}
                    onSelect={() => this._selectWallet(WalletType.walletLink)}
                    tid="web-wallet"
          />
          <ListItem icon={WalletConnect.icon}
                    name={WalletConnect.name}
                    supported={true}
                    isSelected={this.state.walletType === WalletType.walletConnect}
                    onSelect={() => this._selectWallet(WalletType.walletConnect)}
                    tid="web-wallet"
          />
        </ul>
        <Checkbox name="tos"
                  data-test-id="accept-tos"
                  onChange={this._toggle}
                  className={termsAndConditions}
        >
          I accept&nbsp;<a target="_blank"
                           rel="noopener noreferrer"
                           href="/terms"
        >
          Terms of Service
        </a>
        </Checkbox>
        <div className={buttonPlaceholder}>
          <Button size="md"
                  color="secondaryOutlined"
                  className={item}
                  disabled={!this._canConnect()}
                  onClick={this._connect}
                  data-test-id="connect-wallet"
          >
            Connect
          </Button>
        </div>
      </Panel>
    );
  }

  private _toggle = () => {
    this.setState((state: any) => {
      const isChecked = !state.isChecked;
      return { isChecked };
    });
  }

  private _selectWallet = (walletType: WalletType) => {
    this.setState({ walletType });
  }

  private _connect = () => {
    executeWeb3StatusCommand({
      kind: Web3StatusCommandKind.connect,
      type: this.state.walletType!,
      network: 'main'
    });
  }

  private _canConnect = () => {
    return this.state.isChecked && this.state.walletType;
  }
}

class Connected extends React.Component {
  public render() {
    return (
      <Panel heading={`${getCurrentProviderName().name} Connected`}>
        <ul className={classnames(list, single)}>
          {
            hwWallets.map((hwWallet) =>
              <ListItem id={hwWallet.id}
                        key={hwWallet.id}
                        icon={hwWallet.icon}
                        name={hwWallet.name}
                        supported={hwWallet.supported}/>
            )
          }
        </ul>
        <div className={buttonPlaceholder}>
          <Button size="md"
                  color="secondaryOutlined"
                  className={item}
                  onClick={this._disconnect}
                  data-test-id="connect-wallet"
          >
            Disconnect
          </Button>
        </div>
      </Panel>
    );
  }
  private _disconnect = () => {
    executeWeb3StatusCommand({
      kind: Web3StatusCommandKind.disconnect,
    });
  }
}

const Connecting = (props: any) => {
  const _connectingContainerStyles = () => ({
    fontSize: '14px',
    letterSpacing: '.4px',
    lineHeight: '24px',
    height: '216px',
    color: '#828288',
    width: '100%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderTop: '1px solid rgba(88, 88, 95, 0.2)',
    borderBottom: '1px solid rgba(88, 88, 95, 0.2)',
    flexDirection: 'column',
    textAlign: 'center'
  } as React.CSSProperties);

  return (
    <Panel heading="Connecting...">
      <div style={_connectingContainerStyles()}>
        <div>
          <LoadingIndicator size="lg"/>
          Waiting for Approval
          <br/>
          on {getCurrentProviderName().name}
        </div>
      </div>
      <div className={buttonPlaceholder}>
        <Button size="md"
                color="secondaryOutlined"
                className={classnames(item)}
                onClick={props.close}
                data-test-id="connect-wallet"
        >
          Cancel
        </Button>
      </div>
    </Panel>
  );
};

export enum WalletConnectionViewKind {
  connected = 'connected',
  connecting = 'connecting',
  notConnected = 'notConnected',
}

export const walletConnectionViewManual$ = new BehaviorSubject('');

export const WalletConnectionViews = new Map<WalletConnectionViewKind, any>(
[
  [WalletConnectionViewKind.connected, Connected],
  [WalletConnectionViewKind.notConnected, NotConnected],
  [WalletConnectionViewKind.connecting, Connecting],
]);
