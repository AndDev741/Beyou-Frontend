import { render, RenderOptions } from "@testing-library/react";
import { Provider } from "react-redux";
import { PreloadedStateShapeFromReducersMapObject } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import store  from '../redux/store';
import { RootState } from "../redux/rootReducer";
import React from "react";

interface ExtendedRenderOptions extends Omit<RenderOptions, 'queries'> {
    route?: string;
    preloadedState?: PreloadedStateShapeFromReducersMapObject<RootState>;
    storeOverride?: typeof store;
}

export function renderWithProviders(
    ui: React.ReactElement,
    {
        route = "/",
        preloadedState,
        storeOverride,
        ...renderOptions
    }: ExtendedRenderOptions = {}
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