import { render } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import store  from '../redux/store';
import React from "react";

export function renderWithProviders(
    ui: React.ReactElement,
    {
        route = "/",
        preloadedState,
        storeOverride,
        ...renderOptions
    }: any = {}
) {
    const Wrapper = ({children}: {children: React.ReactNode}) => (
        <Provider store={storeOverride || store}>
            <MemoryRouter initialEntries={[route]}>
                {children}
            </MemoryRouter>
        </Provider>
    );

    return render(ui, { wrapper: Wrapper, ...renderOptions});
}