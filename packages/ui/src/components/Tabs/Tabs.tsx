import React, { forwardRef, useState } from 'react';
import './Tabs.css';

export interface TabItem {
  key: string;
  label: React.ReactNode;
  content?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  items: TabItem[];
  activeKey?: string;
  defaultActiveKey?: string;
  onChange?: (activeKey: string) => void;
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  (
    {
      items,
      activeKey: controlledActiveKey,
      defaultActiveKey,
      onChange,
      className = '',
      ...props
    },
    ref
  ) => {
    const defaultKey = defaultActiveKey ?? items[0]?.key;
    const [uncontrolledKey, setUncontrolledKey] = useState<string>(defaultKey);

    const isControlled = controlledActiveKey !== undefined;
    const currentKey = isControlled ? controlledActiveKey : uncontrolledKey;

    const handleTabClick = (item: TabItem) => {
      if (item.disabled) return;
      if (!isControlled) {
        setUncontrolledKey(item.key);
      }
      onChange?.(item.key);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      let nextIndex = currentIndex;
      if (e.key === 'ArrowRight') {
        nextIndex = (currentIndex + 1) % items.length;
      } else if (e.key === 'ArrowLeft') {
        nextIndex = (currentIndex - 1 + items.length) % items.length;
      } else {
        return;
      }

      e.preventDefault();
      const targetItem = items[nextIndex];
      if (targetItem && !targetItem.disabled) {
        handleTabClick(targetItem);
      }
    };

    const currentItem = items.find((item) => item.key === currentKey);

    const classNames = ['qq-tabs', className].filter(Boolean).join(' ');

    return (
      <div ref={ref} className={classNames} {...props}>
        <div role="tablist" className="qq-tabs__nav">
          {items.map((item, index) => {
            const isSelected = item.key === currentKey;
            const tabClassNames = [
              'qq-tabs__tab',
              isSelected ? 'qq-tabs__tab--active' : '',
              item.disabled ? 'qq-tabs__tab--disabled' : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <button
                key={item.key}
                role="tab"
                id={`tab-${item.key}`}
                aria-selected={isSelected}
                aria-controls={`tabpanel-${item.key}`}
                aria-disabled={item.disabled ? 'true' : undefined}
                disabled={item.disabled}
                tabIndex={isSelected ? 0 : -1}
                className={tabClassNames}
                onClick={() => handleTabClick(item)}
                onKeyDown={(e) => handleKeyDown(e, index)}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        {currentItem?.content && (
          <div
            role="tabpanel"
            id={`tabpanel-${currentItem.key}`}
            aria-labelledby={`tab-${currentItem.key}`}
            tabIndex={0}
            className="qq-tabs__panel"
          >
            {currentItem.content}
          </div>
        )}
      </div>
    );
  }
);

Tabs.displayName = 'Tabs';
