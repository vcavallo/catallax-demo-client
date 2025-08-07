# Catallax - Decentralized Contract Work Platform

A comprehensive UI implementation for testing the Catallax protocol (NIP-3400), which enables decentralized contract work with escrow arbitration on Nostr.

## Features

This implementation covers all Catallax protocol features:

### For Arbiters
- **Create Arbiter Services** - Advertise arbitration services with fee structures and expertise areas
- **Manage Service Announcements** - Update service details, policies, and fee structures
- **View Assigned Tasks** - See tasks that use your arbitration services
- **Conclude Tasks** - Document task resolutions and payment confirmations

### For Patrons (Task Creators)
- **Create Task Proposals** - Post detailed work requirements with payment terms
- **Select Arbiters** - Choose from available arbitration services
- **Fund Tasks** - Add escrow funding via Lightning zaps
- **Assign Workers** - Select and assign workers to funded tasks
- **Track Progress** - Monitor task status through completion

### For Workers (Free Agents)
- **Discover Tasks** - Browse available funded tasks
- **Apply for Work** - Contact patrons for task assignments
- **Submit Work** - Mark tasks as submitted for review
- **Track Assignments** - View tasks you're working on

### Discovery & Management
- **Browse Arbiters** - View all available arbitration services with fees and specialties
- **Task Marketplace** - Discover tasks needing funding or workers (with filters)
- **Lightning Integration** - Native zap support for escrow funding and payments
- **Status Tracking** - Real-time updates on task progress
- **Payment History** - View completed task resolutions and outcomes

## Protocol Implementation

The UI implements the complete Catallax protocol specification:

- **Kind 33400**: Arbiter Announcement (parameterized replaceable)
- **Kind 33401**: Task Proposal (parameterized replaceable)
- **Kind 3402**: Task Conclusion (regular event)

### Task Workflow

1. **Arbiter Setup** - Arbiters create service announcements
2. **Task Creation** - Patrons create proposals and select arbiters
3. **Escrow Funding** - Patrons click "Fund Escrow" → pay Lightning invoice → task automatically updates to "funded"
4. **Worker Assignment** - Patrons assign workers to funded tasks
5. **Work Completion** - Workers submit completed work
6. **Payment Resolution** - Arbiters send Lightning payments to workers or refunds to patrons
7. **Task Conclusion** - Arbiters document final resolution with payment receipts

## Development Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

## Test Usage Guide

### Creating an Arbiter Service

1. Click "Create Arbiter Service"
2. Fill in service details, fee structure, and expertise areas
3. Publish to make your services available to patrons

### Posting a Task

1. Click "Create Task"
2. Describe the work, requirements, and payment amount
3. Select an arbiter from available services
4. Fund the task via Lightning to activate it

### Managing Tasks

- **Patrons**: Fund tasks via Lightning, assign workers, track progress
- **Workers**: Submit completed work, communicate with patrons
- **Arbiters**: Send Lightning payments to workers or refunds to patrons, document resolutions

### Lightning Payments

- **WebLN Integration**: Uses browser Lightning wallet extensions (Alby, Mutiny, etc.)
- **QR Code Support**: Scan Lightning invoices with any mobile Lightning wallet
- **LNURL-Pay Support**: Resolves Lightning addresses from user profiles
- **NIP-57 Zaps**: Full Nostr zap implementation with receipts

## Protocol Notes

- Task updates replace previous versions (parameterized replaceable events)
- Payment confirmations reference Lightning zap receipts
- Out-of-band communication handles worker applications and work submission

## Development

Built with:
- Vibed with [MKStack](https://soapbox.pub/mkstack)
- React 18 + TypeScript
- TailwindCSS + shadcn/ui components
- Nostrify for Nostr protocol integration
- TanStack Query for data management
- React Router for navigation

### Enable Real Lightning

**"Demo" payment mode doesn't really work well**.

1. Go to **Settings** tab in the app
2. Toggle **"Real Lightning Payments"**
3. Confirm you understand real Bitcoin will be sent
4. The app will check for WebLN support

