import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Input,
  Modal,
  Alert,
  Switch,
  Tabs,
  Tooltip,
  tokens,
} from '@heizdoobert/quickquiz-ui';

describe('UI SDK Integration in Web App', () => {
  it('exposes design tokens to the application', () => {
    expect(tokens.colors.primary.DEFAULT).toContain('--color-primary');
    expect(tokens.radii.md).toContain('--radius-md');
  });

  it('renders a composed quiz card using UI SDK primitives', () => {
    render(
      <Card data-testid="trivia-card">
        <CardHeader>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <CardTitle>History Quiz</CardTitle>
            <Badge variant="success">Verified</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p>Who was the first president of the United States?</p>
          <Button variant="primary">Answer Now</Button>
        </CardContent>
      </Card>
    );

    expect(screen.getByRole('heading', { name: 'History Quiz' })).toBeDefined();
    expect(screen.getByText('Verified')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Answer Now' })).toBeDefined();
  });

  it('renders interactive modal dialog from UI SDK with callbacks', () => {
    const handleClose = vi.fn();
    render(
      <Modal open={true} onClose={handleClose} title="Quit Session">
        <p>Leave trivia round?</p>
      </Modal>
    );

    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText('Quit Session')).toBeDefined();
    const closeBtn = screen.getByRole('button', { name: /close modal/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders Input primitive with label and user interaction', () => {
    const handleChange = vi.fn();
    render(
      <Input
        label="Group Name"
        placeholder="Enter group name"
        onChange={handleChange}
      />
    );

    const input = screen.getByLabelText('Group Name');
    fireEvent.change(input, { target: { value: 'Trivia Masters' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('renders and interacts with new UI primitives (Alert, Switch, Tabs, Tooltip)', () => {
    const handleSwitch = vi.fn();
    const handleTab = vi.fn();

    render(
      <div>
        <Alert type="success" message="Round 1 Complete" />
        <Switch aria-label="Audio switch" onChange={handleSwitch} />
        <Tabs
          items={[
            { key: 'tab1', label: 'Tab 1', content: <span>Tab 1 Content</span> },
            { key: 'tab2', label: 'Tab 2', content: <span>Tab 2 Content</span> },
          ]}
          onChange={handleTab}
        />
        <Tooltip title="Hint text">
          <button>Hover for hint</button>
        </Tooltip>
      </div>
    );

    expect(screen.getByText('Round 1 Complete')).toBeDefined();
    const switchEl = screen.getByRole('switch', { name: 'Audio switch' });
    fireEvent.click(switchEl);
    expect(handleSwitch).toHaveBeenCalledWith(true);

    const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
    fireEvent.click(tab2);
    expect(handleTab).toHaveBeenCalledWith('tab2');
    expect(screen.getByText('Tab 2 Content')).toBeDefined();

    const hintButton = screen.getByText('Hover for hint');
    fireEvent.mouseEnter(hintButton);
    expect(screen.getByRole('tooltip').textContent).toBe('Hint text');
  });
});

