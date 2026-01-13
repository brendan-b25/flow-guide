import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette, Upload, Loader2 } from 'lucide-react';

export default function BrandingDialog({ manualId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const queryClient = useQueryClient();

  const { data: branding } = useQuery({
    queryKey: ['branding', manualId],
    queryFn: async () => {
      const results = await base44.entities.ManualBranding.filter({ manual_id: manualId });
      return results[0] || null;
    },
    enabled: !!manualId && isOpen
  });

  const [formData, setFormData] = useState({
    primary_color: '#1e40af',
    secondary_color: '#64748b',
    font_family: 'inter',
    header_text: '',
    footer_text: '',
    show_page_numbers: true,
    show_date: true,
    logo_url: ''
  });

  useEffect(() => {
    if (branding) {
      setFormData({
        primary_color: branding.primary_color || '#1e40af',
        secondary_color: branding.secondary_color || '#64748b',
        font_family: branding.font_family || 'inter',
        header_text: branding.header_text || '',
        footer_text: branding.footer_text || '',
        show_page_numbers: branding.show_page_numbers ?? true,
        show_date: branding.show_date ?? true,
        logo_url: branding.logo_url || ''
      });
    }
  }, [branding]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (branding) {
        await base44.entities.ManualBranding.update(branding.id, data);
      } else {
        await base44.entities.ManualBranding.create({ manual_id: manualId, ...data });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['branding', manualId]);
      setIsOpen(false);
    }
  });

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, logo_url: file_url });
    } catch (error) {
      alert('Failed to upload logo. Please try again.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const fonts = [
    { value: 'inter', label: 'Inter (Modern)' },
    { value: 'roboto', label: 'Roboto (Clean)' },
    { value: 'playfair', label: 'Playfair (Elegant)' },
    { value: 'lato', label: 'Lato (Professional)' },
    { value: 'merriweather', label: 'Merriweather (Classic)' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-slate-300">
          <Palette className="w-4 h-4" />
          Branding
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Palette className="w-6 h-6 text-blue-600" />
            Customize Branding & Formatting
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>Company/Brand Logo</Label>
            <div className="flex items-center gap-4">
              {formData.logo_url && (
                <img src={formData.logo_url} alt="Logo" className="h-16 w-auto object-contain border border-slate-200 rounded p-2" />
              )}
              <div className="flex-1">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  id="logo-upload"
                />
                <label htmlFor="logo-upload">
                  <Button variant="outline" asChild disabled={isUploadingLogo}>
                    <span className="cursor-pointer">
                      {isUploadingLogo ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Logo
                        </>
                      )}
                    </span>
                  </Button>
                </label>
              </div>
            </div>
          </div>

          {/* Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary_color">Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="primary_color"
                  type="color"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  className="h-11 w-20"
                />
                <Input
                  type="text"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  className="h-11 flex-1"
                  placeholder="#1e40af"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondary_color">Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  id="secondary_color"
                  type="color"
                  value={formData.secondary_color}
                  onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                  className="h-11 w-20"
                />
                <Input
                  type="text"
                  value={formData.secondary_color}
                  onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                  className="h-11 flex-1"
                  placeholder="#64748b"
                />
              </div>
            </div>
          </div>

          {/* Font Family */}
          <div className="space-y-2">
            <Label htmlFor="font_family">Font Family</Label>
            <Select value={formData.font_family} onValueChange={(value) => setFormData({ ...formData, font_family: value })}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fonts.map((font) => (
                  <SelectItem key={font.value} value={font.value}>
                    {font.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Header/Footer Text */}
          <div className="space-y-2">
            <Label htmlFor="header_text">Header Text (appears on each page)</Label>
            <Input
              id="header_text"
              value={formData.header_text}
              onChange={(e) => setFormData({ ...formData, header_text: e.target.value })}
              placeholder="e.g., Confidential - Internal Use Only"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="footer_text">Footer Text</Label>
            <Textarea
              id="footer_text"
              value={formData.footer_text}
              onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
              placeholder="e.g., © 2026 Company Name. All rights reserved."
              className="h-20 resize-none"
            />
          </div>

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <Label htmlFor="show_page_numbers" className="cursor-pointer">Show page numbers in print</Label>
              <input
                id="show_page_numbers"
                type="checkbox"
                checked={formData.show_page_numbers}
                onChange={(e) => setFormData({ ...formData, show_page_numbers: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <Label htmlFor="show_date" className="cursor-pointer">Show creation date on cover</Label>
              <input
                id="show_date"
                type="checkbox"
                checked={formData.show_date}
                onChange={(e) => setFormData({ ...formData, show_date: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="w-full h-11 bg-blue-600 hover:bg-blue-700"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Branding'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}