import os
import re

files_to_check = [
    'components/auth/tabs/UsernameTab.tsx',
    'components/auth/tabs/EmailTab.tsx',
    'hooks/modals/use-dispute-modal.ts',
    'hooks/modals/use-group-modal.ts',
    'hooks/quiz/use-question-form.ts',
    'components/community/CommentList.tsx',
    'components/community/SuggestionForm.tsx',
    'components/lists/ListQuestionEditor.tsx',
    'components/lists/MyListsDashboard.tsx'
]

for filepath in files_to_check:
    with open(filepath, 'r') as f:
        content = f.read()

    # Replace React.FormEvent<...> with React.SubmitEvent<...>
    new_content = re.sub(r'React\.FormEvent', r'React.SubmitEvent', content)
    
    # Replace import { FormEvent } with import { SubmitEvent }
    # or just FormEvent if it is imported
    new_content = re.sub(r'\bFormEvent\b', r'SubmitEvent', new_content)

    if new_content != content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f'Fixed {filepath}')

