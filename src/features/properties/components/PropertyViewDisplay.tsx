import React from 'react';
import type { Property } from '../types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface PropertyViewDisplayProps {
  property: Property | null | undefined;
}

export function PropertyViewDisplay({ property }: PropertyViewDisplayProps) {
  if (!property) {
    return <div>Property data not available.</div>;
  }

  const addressParts = [
    property.address_street,
    property.address_city,
    property.address_lga,
    property.address_state
  ].filter(Boolean).join(', ');

  return (
    <div className="space-y-6">
       {/* Image Gallery */}
       {property.images && property.images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {property.images.map((image) => (
                    <div key={image.id || image.image_url} className="aspect-video overflow-hidden rounded-lg">
                        <img
                            src={image.image_url}
                            alt={`Property image ${image.order + 1}`}
                            className="object-cover w-full h-full"
                        />
                    </div>
                ))}
            </div>
       )}

       {/* Details Card */}
        <Card>
             <CardHeader>
                <CardTitle>{property.name}</CardTitle>
                 <CardDescription>{property.type || 'N/A'} - <span className="capitalize">{property.status}</span></CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h4 className="font-semibold mb-1">Address</h4>
                        <p className="text-sm text-muted-foreground">{addressParts || 'N/A'}</p>
                    </div>
                     <div>
                        <h4 className="font-semibold mb-1">Base Rate</h4>
                        <p className="text-sm text-muted-foreground">
                            {property.base_rate_amount
                             ? `${property.base_rate_currency} ${property.base_rate_amount.toLocaleString()} per ${property.base_rate_per || 'unit'}`
                             : 'N/A'}
                        </p>
                    </div>
                </div>

                 {property.amenities && property.amenities.length > 0 && (
                     <div>
                        <h4 className="font-semibold mb-2">Amenities</h4>
                        <div className="flex flex-wrap gap-2">
                            {property.amenities.map((amenity) => (
                                <Badge key={amenity} variant="secondary">{amenity}</Badge>
                            ))}
                        </div>
                    </div>
                 )}

                 {property.notes && (
                    <div>
                        <h4 className="font-semibold mb-1">Notes</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{property.notes}</p>
                    </div>
                 )}

                 <div className="text-xs text-muted-foreground pt-4 border-t">
                     Created: {new Date(property.created_at).toLocaleString()} | Updated: {new Date(property.updated_at).toLocaleString()}
                 </div>
            </CardContent>
        </Card>
    </div>
  );
} 