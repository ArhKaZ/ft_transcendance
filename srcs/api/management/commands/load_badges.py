# api/management/commands/load_badges.py
import os
from django.core.management.base import BaseCommand
from api.models import Badge

class Command(BaseCommand):
    help = 'Load Smash Ultimate character badges'

    def handle(self, *args, **options):
        badge_dir = 'media/badges'  # Adjusted path
        
        # Manual name mapping for special cases
        name_overrides = {
            'B_&_K': 'Banjo & Kazooie',
            'P_&_M': 'Piranha Plant & M',  # Adjust as needed
            'G&W': 'Mr. Game & Watch',
            'mk': 'Meta Knight',
            '_Olimar': 'Olimar'  # Fix leading underscore
        }

        for filename in os.listdir(badge_dir):
            if filename.startswith('Badge_') and filename.lower().endswith('.png'):
                try:
                    # Extract base name
                    raw_name = filename[6:-4]  # Remove "Badge_" and ".png"
                    
                    # Apply overrides
                    char_name = name_overrides.get(raw_name, raw_name)
                    
                    # Formatting cleanup
                    char_name = char_name.replace('_', ' ')
                    char_name = ' '.join([word.capitalize() for word in char_name.split()])
                    
                    # Handle special characters
                    char_name = char_name.replace('&', '&').replace('-', '-')  # Preserve existing symbols
                    
                    with open(os.path.join(badge_dir, filename), 'rb') as f:
                        Badge.objects.update_or_create(
                            name=char_name,
                            defaults={'image': f.read()}
                        )
                    self.stdout.write(f"Processed {char_name} badge")
                    
                except Exception as e:
                    self.stderr.write(f"Error processing {filename}: {str(e)}")