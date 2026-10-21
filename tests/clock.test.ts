import { describe, expect, test } from 'claude-code/testing'

import { usesHour12 } from '../hooks/clock'

describe('clock format', () => {
  test('follows the region when no 12h/24h switch is forced', async () => {
    expect(usesHour12({ locale: 'en_DK' })).toBe(false)
    expect(usesHour12({ locale: 'en_DK@currency=EUR' })).toBe(false)
    expect(usesHour12({ locale: 'en_US' })).toBe(true)
  })

  test('a forced switch wins over the region', async () => {
    expect(usesHour12({ force24: true, locale: 'en_US' })).toBe(false)
    expect(usesHour12({ force12: true, locale: 'en_DK' })).toBe(true)
  })

  test('an unreadable region falls back to a usable answer', async () => {
    expect(typeof usesHour12({ locale: '' })).toBe('boolean')
    expect(typeof usesHour12({ locale: 'not a locale' })).toBe('boolean')
  })
})
