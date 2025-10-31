## Project Overview

This is a Next.js (React, TypeScript) project bootstrapped with `create-next-app`. It functions as a client-side application, likely a Telegram Mini App, interacting with a backend API to manage various business intelligence (BI) data, orders, stock remains, tasks, and events. Key technologies include Next.js for the framework, React for UI, TypeScript for type safety, TanStack Query for data fetching and caching, Zustand for state management, Formik and Yup for form handling, Axios for API requests, and react-hot-toast for notifications.

## Building and Running

The project uses standard Next.js scripts for development, building, and starting the application.

*   **Install Dependencies:**
    ```bash
    npm install
    ```
*   **Run Development Server:**
    ```bash
    npm run dev
    ```
    (This will start the development server at `http://localhost:3000`)
*   **Build for Production:**
    ```bash
    npm run build
    ```
*   **Start Production Server:**
    ```bash
    npm run start
    ```
*   **Run Linter:**
    ```bash
    npm run lint
    ```

## Development Conventions

*   **Language:** TypeScript is used throughout the project for type safety and improved code quality.
*   **Linting & Formatting:** ESLint and Prettier are configured to enforce consistent code style and identify potential issues.
*   **Data Fetching:** TanStack Query is used for managing server state, including data fetching, caching, and synchronization.
*   **State Management:** Zustand is utilized for client-side state management.
*   **Form Handling:** Formik and Yup are employed for building and validating forms.
*   **API Interaction:** All backend communication is handled via `axios` in the `lib/api.ts` file, often including `X-Telegram-Init-Data` headers.
*   **Component Structure:** Components are organized under the `components/` directory, with specific subdirectories for related functionalities (e.g., `components/Bi/`). Pages are defined in the `app/` directory following Next.js conventions.
