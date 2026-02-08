import { AbstractSeed } from './AbstractSeed';

export class SeedGraph {
  private nodes: Set<AbstractSeed<any>> = new Set();
  add(seed: AbstractSeed<any>) {
    this.nodes.add(seed);
    seed.dependencies.forEach((d) => this.nodes.add(d));
  }
  resolveOrder(): AbstractSeed<any>[] {
    const visited = new Set<AbstractSeed<any>>();
    const temp = new Set<AbstractSeed<any>>();
    const order: AbstractSeed<any>[] = [];
    const visit = (n: AbstractSeed<any>) => {
      if (visited.has(n)) return;
      if (temp.has(n)) throw new Error('seed dependency cycle');
      temp.add(n);
      n.dependencies.forEach(visit);
      temp.delete(n);
      visited.add(n);
      order.push(n);
    };
    this.nodes.forEach(visit);
    return order;
  }
}
