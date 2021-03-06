import { Editable, useEditableContext } from "./editable-context";
import {
  act,
  fireEvent,
  getByTestId,
  getByText,
  render
} from "@testing-library/react";

import React from "react";

function TestHarness() {
  const { value, onChange, onCommit, onCancel, status } = useEditableContext<
    string,
    string
  >();
  return (
    <div>
      <div data-testid="form">
        <p>{status}</p>
        <input
          data-testid="input"
          value={value}
          onChange={({ target: { value: nextValue } }) => onChange(nextValue)}
        />
      </div>
      <button onClick={() => onCommit("SUBMIT")}>Submit</button>
      <button onClick={onCancel}>Cancel</button>
      <button onClick={() => onCommit("DELETE")}>Delete</button>
    </div>
  );
}

describe("Editable Context", () => {
  it("renders the harness", () => {
    const { container } = render(
      <Editable value="INITIAL_VALUE">
        <TestHarness />
      </Editable>
    );
    expect(getByTestId(container, "form")).toMatchInlineSnapshot(`
      <div
        data-testid="form"
      >
        <p>
          PRESENTING
        </p>
        <input
          data-testid="input"
          value="INITIAL_VALUE"
        />
      </div>
    `);
  });

  it("renders the updated values after change", () => {
    const { container } = render(
      <Editable value="INITIAL_VALUE">
        <TestHarness />
      </Editable>
    );

    fireEvent.change(getByTestId(container, "input"), {
      target: { value: "NEW_VALUE" }
    });
    expect(getByTestId(container, "form")).toMatchInlineSnapshot(`
      <div
        data-testid="form"
      >
        <p>
          EDITING
        </p>
        <input
          data-testid="input"
          value="NEW_VALUE"
        />
      </div>
    `);
  });

  it("resets after onCancel is triggered", () => {
    const handleCancel = jest.fn();
    const { container } = render(
      <Editable value="INITIAL_VALUE" onCancel={handleCancel}>
        <TestHarness />
      </Editable>
    );

    fireEvent.change(getByTestId(container, "input"), {
      target: { value: "NEW_VALUE" }
    });
    fireEvent.click(getByText(container, /Cancel/));
    expect(handleCancel).toHaveBeenCalledWith("NEW_VALUE");
    expect(getByTestId(container, "form")).toMatchInlineSnapshot(`
      <div
        data-testid="form"
      >
        <p>
          PRESENTING
        </p>
        <input
          data-testid="input"
          value="INITIAL_VALUE"
        />
      </div>
    `);
  });

  describe("synchronous commits", () => {
    it("triggers the commit when clicking Submit", () => {
      const handleCommit = jest.fn();
      const { container } = render(
        <Editable value="INITIAL_VALUE" onCommit={handleCommit}>
          <TestHarness />
        </Editable>
      );

      fireEvent.change(getByTestId(container, "input"), {
        target: { value: "NEW_VALUE" }
      });
      fireEvent.click(getByText(container, /Submit/));
      expect(handleCommit).toHaveBeenCalledWith("SUBMIT", "NEW_VALUE");
      expect(getByTestId(container, "form")).toMatchInlineSnapshot(`
        <div
          data-testid="form"
        >
          <p>
            PRESENTING
          </p>
          <input
            data-testid="input"
            value="INITIAL_VALUE"
          />
        </div>
      `);
    });
  });

  describe("asynchronous commits", () => {
    it("transitions to COMMITING then PRESENTING when onCommit returns a promise", async () => {
      const promise = Promise.resolve();
      const handleCommit = jest.fn(() => promise);
      const { container } = render(
        <Editable value="INITIAL_VALUE" onCommit={handleCommit}>
          <TestHarness />
        </Editable>
      );

      fireEvent.change(getByTestId(container, "input"), {
        target: { value: "NEW_VALUE" }
      });
      fireEvent.click(getByText(container, /Submit/));
      expect(handleCommit).toHaveBeenCalledWith("SUBMIT", "NEW_VALUE");
      expect(getByTestId(container, "form")).toMatchInlineSnapshot(`
        <div
          data-testid="form"
        >
          <p>
            COMMITTING
          </p>
          <input
            data-testid="input"
            value="NEW_VALUE"
          />
        </div>
      `);
      await act(async () => {
        await promise;
      });
      expect(getByTestId(container, "form")).toMatchInlineSnapshot(`
        <div
          data-testid="form"
        >
          <p>
            PRESENTING
          </p>
          <input
            data-testid="input"
            value="INITIAL_VALUE"
          />
        </div>
      `);
    });

    it("doesn't error when component unmounts during commit", async () => {
      const promise = Promise.resolve();
      const handleCommit = jest.fn(() => promise);
      jest.spyOn(console, "error");
      const { container, unmount } = render(
        <Editable value="INITIAL_VALUE" onCommit={handleCommit}>
          <TestHarness />
        </Editable>
      );

      fireEvent.change(getByTestId(container, "input"), {
        target: { value: "NEW_VALUE" }
      });
      fireEvent.click(getByText(container, /Submit/));

      unmount();
      await act(async () => {
        await promise;
      });
      expect(console.error).not.toHaveBeenCalled();
      expect(container).toMatchInlineSnapshot(`<div />`);
    });

    it("transitions to COMMITING then EDITING when onCommit rejects a promise", async () => {
      const promise = Promise.reject();
      const handleCommit = jest.fn(() => promise);
      const { container } = render(
        <Editable value="INITIAL_VALUE" onCommit={handleCommit}>
          <TestHarness />
        </Editable>
      );

      fireEvent.change(getByTestId(container, "input"), {
        target: { value: "NEW_VALUE" }
      });
      fireEvent.click(getByText(container, /Submit/));
      expect(handleCommit).toHaveBeenCalledWith("SUBMIT", "NEW_VALUE");
      expect(getByTestId(container, "form")).toMatchInlineSnapshot(`
        <div
          data-testid="form"
        >
          <p>
            COMMITTING
          </p>
          <input
            data-testid="input"
            value="NEW_VALUE"
          />
        </div>
      `);

      await act(async () => {
        await promise.catch(() => null);
      });
      expect(getByTestId(container, "form")).toMatchInlineSnapshot(`
        <div
          data-testid="form"
        >
          <p>
            EDITING
          </p>
          <input
            data-testid="input"
            value="NEW_VALUE"
          />
        </div>
      `);
    });
  });
});
