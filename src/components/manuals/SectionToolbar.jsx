import { memo } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Sparkles, MessageSquare, Image, Smile, MoreHorizontal, Trash2 } from 'lucide-react';

const SectionToolbar = memo(function SectionToolbar({ 
  onImprove, 
  onRequestChanges, 
  onAddIllustration, 
  onSymbolPicker,
  onDelete,
  isLoading 
}) {
  return (
    <div className="flex items-center gap-1">
      {/* Primary AI Actions */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onImprove}
        disabled={isLoading}
        className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 h-8 px-2"
        title="Improve with AI"
      >
        <Sparkles className="w-4 h-4" />
        <span className="hidden sm:inline ml-1">Improve</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={onRequestChanges}
        disabled={isLoading}
        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 px-2"
        title="Request AI Changes"
      >
        <MessageSquare className="w-4 h-4" />
        <span className="hidden sm:inline ml-1">Edit</span>
      </Button>

      {/* More Actions Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-500 hover:text-slate-700 h-8 px-2"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={onAddIllustration} className="cursor-pointer">
            <Image className="w-4 h-4 mr-2 text-teal-600" />
            Add Illustration
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onSymbolPicker} className="cursor-pointer">
            <Smile className="w-4 h-4 mr-2 text-amber-600" />
            Insert Symbol
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDelete} className="cursor-pointer text-red-600 focus:text-red-600">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Section
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

export default SectionToolbar;