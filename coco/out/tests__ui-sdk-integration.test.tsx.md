# tests/ui-sdk-integration.test.tsx
lines:113 exports:
---
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
