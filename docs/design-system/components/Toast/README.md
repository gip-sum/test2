# Toast

Non-blocking confirmation that an action happened, and the one place an undo lives.

**A button says what happens and the toast echoes it.** "Save" → "Saved". "Publish" → "Published". Matching the verb is what makes the confirmation register.

**Rules**

- Bottom-centre on phones (above the bottom nav), bottom-right on desktop.
- 4 seconds for a plain confirmation, 8 when it carries an undo, and it never auto-dismisses while hovered or focused.
- **Maximum one at a time.** A second replaces the first; toasts never stack.
- `role="status"` and `aria-live="polite"` — announced without stealing focus.
- Errors that need a decision are **not** toasts. A toast is for things the user can safely ignore.
- Undo is only offered where the action is genuinely reversible.

**Consumer provides**: the message, an optional undo handler and the variant.
