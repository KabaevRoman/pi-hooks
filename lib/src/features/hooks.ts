import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { acquire } from '@kabaevroman/pi-code-core';
import { registerStopHook } from '@kabaevroman/pi-code-core/extensions/hooks';
export default function (pi: ExtensionAPI): void {
  const state = acquire(pi,'hooks'); if (!state) return;
  const {runtime:r,features} = state;

    registerStopHook(r);
    pi.on('tool_call',async(e,ctx)=> {
      if (r.tools.has(e.toolName)) return;
      await r.reload(ctx);
      const result = await r.hooks.run('PreToolUse',{tool_name:e.toolName,tool_input:e.input,tool_use_id:e.toolCallId},r.config,ctx.cwd,ctx.signal);
      if (result.deny || result.updatedInput) return {block:true,reason:result.deny ?? 'Native tool hook rewrites require the optional compatibility tool wrappers; no input was changed.'};
    });
    pi.on('tool_result',async(e,ctx)=> {
      if (r.tools.has(e.toolName)) return;
      const result = await r.hooks.run(e.isError ? 'PostToolUseFailure' : 'PostToolUse',{tool_name:e.toolName,tool_input:e.input,tool_response:e.content},r.config,ctx.cwd,ctx.signal);
      if (result.context.length) return {content:[...e.content,...result.context.map(text=>({type:'text' as const,text}))]};
    });
    pi.on('input',async(e,ctx)=> {
      await r.reload(ctx);
      const outcome = await r.hooks.run('UserPromptSubmit',{prompt:e.text},r.config,ctx.cwd,ctx.signal);
      if (outcome.deny) {r.message(outcome.deny);return {action:'handled' as const};}
      if (outcome.context.length) return {action:'transform' as const,text:e.text+'\n'+outcome.context.join('\n'),images:e.images};
    });

}
