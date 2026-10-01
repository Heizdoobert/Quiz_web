# tests/utils.test.ts
lines:40 exports:
---
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadJson } from '@/lib/utils';

describe('downloadJson', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('creates a download link, triggers click, and cleans up with delayed revocation', () => {
    const mockCreateObjectURL = vi.fn().mockReturnValue('blob:http://localhost/mock-uuid');
    const mockRevokeObjectURL = vi.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    const appendChildSpy = vi.spyOn(document.body, 'appendChild');
    const removeChildSpy = vi.spyOn(document.body, 'removeChild');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const testData = { hello: 'world', count: 42 };
    downloadJson('test-file.json', testData);

    expect(mockCreateObjectURL).toHaveBeenCalledOnce();
    expect(appendChildSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();

    // Revocation should not happen immediately (to avoid premature cancellation)
    expect(mockRevokeObjectURL).not.toHaveBeenCalled();

    // Fast-forward timers by 1000ms
    vi.advanceTimersByTime(1000);

    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/mock-uuid');
  });
});
