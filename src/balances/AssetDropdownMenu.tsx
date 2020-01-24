import * as classnames from 'classnames';
import * as React from 'react';
import dottedMenuSvg from '../marginTrading/positions/dotted-menu.svg';
import chevronDownSvg from '../icons/chevron-down.svg';
import { Button } from '../utils/forms/Buttons';
import { SvgImage } from '../utils/icons/utils';
import * as styles from './mtBalancesView.scss';

interface AssetDropdownMenuProps {
  asset: string;
  actions: React.ReactNode[];
  withIcon?: boolean;
  label?: string;
}

interface AssetDropdownMenuState {
  isCollapsed: boolean;
}

export class AssetDropdownMenu extends React.Component<AssetDropdownMenuProps,
  AssetDropdownMenuState> {

  constructor(props: AssetDropdownMenuProps) {
    super(props);
    this.state = {
      isCollapsed: false
    };
  }

  public render() {
    const { asset, actions, withIcon, label } = this.props;
    return (
      <div
        className={classnames(styles.dropdownMenu, this.state.isCollapsed && styles.hover)}
        data-test-id={'dropdown'}
        onMouseOver={this.handleOnMouseOver}
        onMouseOut={this.handleOnMouseOut}
      >
        <Button
          size="md"
          color="secondaryOutlined"
          className={styles.dropdownButton}
        >
          { withIcon && <SvgImage image={dottedMenuSvg}/> }
          {
            label && 
            <>
              <span>{label}</span> 
              <SvgImage image={chevronDownSvg} 
                        className={classnames(styles.arrowDown, styles.dark)
              }/>
            </>
          }
        </Button>
        <div className={styles.dropdownList}>
          {
            actions.map((actionBtn, index) =>
              <div key={`${asset}-${index}`}
                   className={styles.actionButton}
              >
                {actionBtn}
              </div>
            )
          }
        </div>
      </div>
    );
  }

  private handleOnMouseOver = () => {
    this.setState({ isCollapsed: true });
  }

  private handleOnMouseOut = () => {
    this.setState({ isCollapsed: false });
  }
}
