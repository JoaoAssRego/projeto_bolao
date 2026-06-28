# Product

## Users

~30 active participants, all Brazilian, using this on mobile (PWA). Casual enough to not want a complicated login, competitive enough to care deeply about rankings. They open the app before kickoff to lock in a prediction, and again after the match to see who scored points. Context: phone in hand, maybe watching the game at the same time. Not tech workers — they shouldn't have to think about the interface.

## Product Purpose

A World Cup betting pool for a group of friends. Predict match scores before kickoff, earn points based on accuracy, track the standings. No money involved — just pride. The score entry, result reveal, and standings table are the three load-bearing surfaces. Leagues add a layer of personal rivalry — subgroups competing within the global pool — but the core loop is unchanged. Everything else is secondary.

## Brand Personality

Competitive, tense, serious. The mood is a futsal court at 8pm, everyone wants to win, nobody is joking. Not carnival energy — focused rivalry among people who know each other well. Personal but not cute. Urgent but not frantic.

## Anti-references

- **Apps de apostas (Bet365, Sportingbet):** Cluttered, ad-heavy, aggressive upsell patterns. The UI feels like it's trying to extract money from you. Avoid busy layouts, excessive CTAs, neon overload.
- **SaaS dashboard americano (Linear, Vercel, Stripe):** Too cold, too corporate. Beautiful but impersonal — designed for strangers at work, not friends competing for bragging rights.
- **Design infantil:** Cartoon mascots, round bubble fonts, over-animated celebrations. Treating adults like children.
- **Branding FIFA / oficial:** Institutional, multilingual, committee-designed. The opposite of a personal group app.

## Design Principles

1. **Standings first.** The ranking table is the emotional core — the "I'm in first place" moment is what players check most. Every screen should make it easy to get back there. Leagues surface that moment within a tighter circle of rivals.
2. **Tension over celebration.** The interface should feel like the final minutes of a match, not the post-game party. Weight and stillness over bounce and confetti.
3. **Zero friction.** Pick a score, lock it, check results. The path between intent and action must be as short as possible — no confirmation dialogs, no unnecessary steps.
4. **Color earns its place.** Yellow = action, green = correct, red = live urgency. Color is semantic, never decorative. Adding color for atmosphere dilutes the signal.
5. **Personal scale.** This is built for a specific group of friends who know each other. It should feel handmade and specific, not like a generic product scaled for thousands.

## Accessibility & Inclusion

WCAG AA minimum. 4.5:1 contrast ratio for all text. Minimum 44px touch targets on interactive elements. Honor `prefers-reduced-motion` for any animations. System font stack already in use — no exotic typeface dependencies.
