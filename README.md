## Electronic Academic Research Management System (EARMS)
The Electronic Academic Research Management System (EARMS) is a microservice-based platform designed to streamline and automate the lifecycle of student research projects in tertiary institutions. By integrating seamlessly with existing institutional infrastructure, EARMS eliminates administrative bottlenecks, improves supervisor-student workflows, and ensures complete transparency in grant routing, ethics approvals, and budget clearances.
------------------------------
## 🚀 Key Features

* Intelligent Workflow Automation: Rule-based routing for rapid grant approvals, Institutional Review Board (IRB) ethics checks, and departmental budget sign-offs.
* Microservice Architecture: Decoupled services ensure high availability, fault tolerance, and independent scaling for high-traffic academic periods.
* Institutional Identity Sync: Direct integration with university directories leveraging secure authentication flows.
* Comprehensive Dashboards: Tailored, accessible user interfaces built for Students (milestone tracking), Faculty (review queues), and Admins (system topology & audit logging).

------------------------------
## 🛠️ System Architecture
EARMS is structured around an ecosystem of independent microservices mediated by a centralized API gateway:

                      +-----------------------------+

                      |    React Single Page App    |
                      +--------------+--------------+
                                     | (Axios / Bearer Token)
                      +--------------v--------------+

                      |         API Gateway         |
                      +--------------+--------------+
                                     |
         +---------------------------+---------------------------+

         |                           |                           |
+--------v--------+         +--------v--------+         +--------v--------+

|  Auth & Sync    |         |    Workflow     |         |  Analytics &    |
|  Service        |         |  Engine (IRB)   |         |  Audit Service  |
+--------+--------+         +--------+--------+         +--------+--------+

         |                           |                           |
+--------v--------+         +--------v--------+         +--------v--------+

|  Institutional  |         |  Rules Database |         |  Immutable Log  |
|  Identity Provider|       |  (PostgreSQL)   |         |  Data Store     |
| (OAuth2 Server) |         |                 |         |                 |
+-----------------+         +-----------------+         +-----------------+

## Core Microservices

   1. Auth & Sync Service: Coordinates Single Sign-On (SSO) exchanges and maps external identity claims into role-based permissions (RBAC).
   2. Workflow Automation Engine: Evaluates milestone submissions against department-specific routing rules and dispatches live notification events.
   3. Audit & Analytics Engine: Logs timestamp entries for all structural status changes to provide fully immutable project tracking records.

------------------------------
## ⚙️ Tech Stack## Frontend Client

* Core Library: React 18+ (Functional components with Hooks architecture)
* State Management: Zustand / Redux Toolkit (Client state) & TanStack Query (Server state synchronization)
* Routing: React Router v6
* Styling: Tailwind CSS (Fully configured for WCAG 2.1 AA contrast compliance)
* Auth Client: oidc-client-ts / react-oidc-context (Standardized PKCE-secured workflow)

## Backend Ecosystem

* Runtime Environment: Node.js (Express / NestJS) or Python (FastAPI)
* Database Management: PostgreSQL (Primary data storage) & Redis (Session caching & token blocklists)
* Event Handling: Apache Kafka or RabbitMQ (Asynchronous inter-service messaging)
* Container Deployments: Docker & Kubernetes clusters

------------------------------
## 🔒 Authentication & Identity Flow
The system employs OAuth 2.0 with Authorization Code Flow + PKCE (Proof Key for Code Exchange) to secure client-side interactions safely without exposing sensitive client secrets.

+------------+          +-----------------------+          +------------------------+

| React App  |          | Institutional OAuth2  |          |   EARMS API Gateway     |
|  (Client)  |          |   Identity Provider   |          |     (Resource Server)  |
+-----+------+          +-----------+-----------+          +-----------+------------+

      |                             |                                  |
      | 1. Redirect to Login        |                                  |
      +---------------------------->+                                  |

      |                             |                                  |
      | 2. Auth Code (Post-Login)   |                                  |
      +<----------------------------+                                  |

      |                             |                                  |
      | 3. Exchange Code for Tokens |                                  |
      +---------------------------->+                                  |

      |                             |                                  |
      | 4. Return JWT Access Token  |                                  |
      +<----------------------------+                                  |

      |                                                                |
      | 5. Request with HTTP Authorization Header (Bearer <token>)    |
      +--------------------------------------------------------------->+

## Token Configuration Required (.env file schema)

# React App Environment Variables
VITE_EARMS_AUTH_URL=https://yourinstitution.edu
VITE_EARMS_CLIENT_ID=earms_spa_client_prod_0123
VITE_EARMS_REDIRECT_URI=http://localhost:3000/authentication/callback
VITE_EARMS_API_GATEWAY_URL=http://localhost:8080/api/v1

------------------------------
## 💻 Getting Started## Prerequisites

* Node.js (v18.0.0 or higher)
* Docker Desktop / Docker Compose
* Package Manager: npm or pnpm

## Installation Setup

   1. Clone the platform repository:
   
   git clone https://github.com
   cd earms-platform
   
   2. Initialize local environment configurations:
   Navigate to both the frontend panel and downstream microservice paths to generate your active environmental secrets:
   
   cp apps/frontend/.env.example apps/frontend/.env
   
   3. Orchestrate runtime dependencies via Docker:
   Spin up downstream datastores, message queues, and mock API interfaces:
   
   docker-compose up --build -d
   
   4. Boot the localized React client web server:
   
   cd apps/frontend
   npm install
   npm run dev
   
   Open your environment instance at http://localhost:3000 to review the layout components.

