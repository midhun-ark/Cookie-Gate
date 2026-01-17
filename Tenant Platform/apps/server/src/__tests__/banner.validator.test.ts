import { describe, it, expect } from '@jest/globals';
import {
    bannerCustomizationSchema,
    updateBannerCustomizationSchema
} from '../validators/banner.validator';

describe('Banner Validators', () => {
    describe('bannerCustomizationSchema', () => {
        it('should validate correct DPDPA-compliant banner', () => {
            const result = bannerCustomizationSchema.safeParse({
                primaryColor: '#0066CC',
                secondaryColor: '#666666',
                backgroundColor: '#FFFFFF',
                textColor: '#333333',
                acceptButtonColor: '#0066CC',
                rejectButtonColor: '#0066CC', // Same as accept
                acceptButtonText: 'Accept All',
                rejectButtonText: 'Reject All',
                customizeButtonText: 'Customize',
                position: 'bottom',
                layout: 'banner',
            });
            expect(result.success).toBe(true);
        });

        it('should reject different accept/reject button colors', () => {
            const result = bannerCustomizationSchema.safeParse({
                primaryColor: '#0066CC',
                secondaryColor: '#666666',
                backgroundColor: '#FFFFFF',
                textColor: '#333333',
                acceptButtonColor: '#00CC00', // Green
                rejectButtonColor: '#CC0000', // Red - DIFFERENT!
                acceptButtonText: 'Accept All',
                rejectButtonText: 'Reject All',
                customizeButtonText: 'Customize',
                position: 'bottom',
                layout: 'banner',
            });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.errors[0].message).toContain('equal prominence');
            }
        });

        it('should reject invalid hex colors', () => {
            const result = bannerCustomizationSchema.safeParse({
                primaryColor: 'red', // Invalid
                secondaryColor: '#666666',
                backgroundColor: '#FFFFFF',
                textColor: '#333333',
                acceptButtonColor: '#0066CC',
                rejectButtonColor: '#0066CC',
                acceptButtonText: 'Accept All',
                rejectButtonText: 'Reject All',
                customizeButtonText: 'Customize',
                position: 'bottom',
                layout: 'banner',
            });
            expect(result.success).toBe(false);
        });

        it('should reject invalid position', () => {
            const result = bannerCustomizationSchema.safeParse({
                primaryColor: '#0066CC',
                secondaryColor: '#666666',
                backgroundColor: '#FFFFFF',
                textColor: '#333333',
                acceptButtonColor: '#0066CC',
                rejectButtonColor: '#0066CC',
                acceptButtonText: 'Accept All',
                rejectButtonText: 'Reject All',
                customizeButtonText: 'Customize',
                position: 'left', // Invalid
                layout: 'banner',
            });
            expect(result.success).toBe(false);
        });

        it('should accept valid positions', () => {
            for (const position of ['bottom', 'top', 'center']) {
                const result = bannerCustomizationSchema.safeParse({
                    primaryColor: '#0066CC',
                    secondaryColor: '#666666',
                    backgroundColor: '#FFFFFF',
                    textColor: '#333333',
                    acceptButtonColor: '#0066CC',
                    rejectButtonColor: '#0066CC',
                    acceptButtonText: 'Accept All',
                    rejectButtonText: 'Reject All',
                    customizeButtonText: 'Customize',
                    position,
                    layout: 'banner',
                });
                expect(result.success).toBe(true);
            }
        });

        it('should reject button text with very different lengths', () => {
            const result = bannerCustomizationSchema.safeParse({
                primaryColor: '#0066CC',
                secondaryColor: '#666666',
                backgroundColor: '#FFFFFF',
                textColor: '#333333',
                acceptButtonColor: '#0066CC',
                rejectButtonColor: '#0066CC',
                acceptButtonText: 'Accept All Cookies and Continue',
                rejectButtonText: 'No', // Much shorter!
                customizeButtonText: 'Customize',
                position: 'bottom',
                layout: 'banner',
            });
            expect(result.success).toBe(false);
        });
    });
});
